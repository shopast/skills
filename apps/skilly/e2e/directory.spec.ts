import { test, expect } from '@playwright/test'
import catalog from '../src/lib/server/catalog.json' with { type: 'json' }
import { PAGE_SIZE } from '../src/lib/search'

test('searches while typing, highlights matches and preserves the search when opening a skill', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('.skill-card')).toHaveCount(PAGE_SIZE)
  const search = page.getByRole('textbox', { name: 'Search skills and full descriptions' })
  await search.fill('typography')
  await expect(page).toHaveURL(/q=typography/)
  await expect(page.locator('.skill-card mark').first()).toHaveText(/typography/i)
  await page.getByRole('link', { name: 'Design', exact: true }).click()
  await expect(page.locator('.category-tag').first()).toHaveText('Design')
  await page.locator('.skill-card').first().click()
  await expect(page.getByRole('button', { name: 'Copy install command' })).toBeVisible()
  await expect(page.locator('.instructions pre')).not.toBeEmpty()
  await expect(page.locator('.instructions mark').first()).toBeVisible()
  await page.getByRole('link', { name: 'Back to search results' }).click()
  await expect(page).toHaveURL(/q=typography/)
  await expect(page.getByRole('link', { name: 'Design', exact: true })).toHaveAttribute(
    'aria-current',
    'true'
  )
  await expect(search).toHaveValue('typography')
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await expect(page).not.toHaveURL(/q=/)
  await expect(search).toHaveValue('')
  await search.fill('no-skill-exists-zz123')
  await expect(page.getByText('No skills found. Still plenty possible.')).toBeVisible()
  await page.getByRole('link', { name: 'Clear all filters' }).click()
  await expect(page.locator('.skill-card')).toHaveCount(PAGE_SIZE)
  await page.goto('/skills/missing')
  await expect(page.getByRole('heading', { name: 'Skill not found' })).toBeVisible()
  expect(errors).toEqual([])
})

test('searches a term that exists only in frontmatter description', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.getByRole('textbox', { name: 'Search skills and full descriptions' }).fill('distinctive')
  await expect(page).toHaveURL(/q=distinctive/)
  await expect(page.locator('.skill-card').filter({ hasText: 'frontend-design' })).toBeVisible()
  await expect(page.locator('.skill-card mark').first()).toHaveText(/distinctive/i)
})

test('paginates, filters repositories and restores navigation state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const first = await page.locator('.skill-card').first().getAttribute('href')
  await page.getByRole('link', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  expect(await page.locator('.skill-card').first().getAttribute('href')).not.toBe(first)
  await expect(
    page.getByText(`Page 2 of ${Math.ceil(catalog.skills.length / PAGE_SIZE)}`, { exact: false })
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Repository', exact: true })
    .selectOption('obra/superpowers')
  await expect(page).not.toHaveURL(/page=2/)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.publisher').first()).toHaveText('obra/superpowers')
  await expect(page.locator('.publisher').filter({ hasNotText: 'obra/superpowers' })).toHaveCount(0)
  await page.getByRole('textbox').fill('debugging')
  await expect(page).toHaveURL(/q=debugging/)
  await page.getByRole('link', { name: 'Workflow', exact: true }).click()
  await expect(page).toHaveURL(/category=Workflow/)
  await page.goBack()
  await expect(page.getByRole('textbox')).toHaveValue('debugging')
})

test('supports mobile search, categories and pagination without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto('/', { waitUntil: 'networkidle' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.getByRole('link', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.getByRole('textbox').fill('typography')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('.skill-card').first()).toBeVisible()
  await page.getByRole('link', { name: 'Design', exact: true }).click()
  await expect(page.locator('.category-tag').first()).toHaveText('Design')
  await expect(page).not.toHaveURL(/page=2/)
  await context.close()
})
