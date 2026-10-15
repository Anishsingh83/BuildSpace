import { expect, test } from '@playwright/test'

const PASSWORD = 'e2e-long-password-123'
const PREVIEW = 'iframe[title="Project preview"]'

test('sign up, build, save, share, unshare and clean up', async ({ page, browser, baseURL }) => {
  const username = `e2e_${Date.now().toString(36)}`

  // Sign up
  await page.goto('/signup')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Email').fill(`${username}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirm password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Your projects' })).toBeVisible()

  // Create a project from the To-do template
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByLabel('Project name').fill('E2E Todo')
  await page.getByRole('radio', { name: /To-do app/ }).check()
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+$/)

  // The sandboxed preview runs the project's own JavaScript
  const preview = page.frameLocator(PREVIEW)
  await expect(preview.getByRole('heading', { name: 'My tasks' })).toBeVisible()
  await preview.getByPlaceholder('What needs doing?').fill('Write the e2e test')
  await preview.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(preview.getByText('Write the e2e test')).toBeVisible()
  await expect(preview.getByText('1 of 1 left')).toBeVisible()

  // Edit in Monaco and save
  await page.locator('.monaco-editor').first().click()
  await page.keyboard.press('Control+End')
  await page.keyboard.insertText('E2E-MARKER')
  const save = page.getByRole('button', { name: 'Save', exact: true })
  await expect(save).toBeEnabled()
  await save.click()
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible()

  // The edit survives a reload, so it really reached the database
  await page.reload()
  await expect(page.frameLocator(PREVIEW).locator('body')).toContainText('E2E-MARKER')

  // Publish
  await page.getByRole('button', { name: 'Private', exact: true }).click()
  await page.getByRole('button', { name: 'Make public' }).click()
  await expect(page.getByRole('button', { name: 'Public', exact: true })).toBeVisible()
  const href = await page
    .getByRole('link', { name: 'Open public page in a new tab' })
    .getAttribute('href')
  expect(href).toMatch(/^\/p\/e2e-todo-[0-9a-f]{8}$/)

  // A logged-out visitor can see it
  const visitor = await browser.newContext({ baseURL })
  const anon = await visitor.newPage()
  await anon.goto(href!)
  await expect(anon.getByRole('heading', { name: 'E2E Todo' })).toBeVisible()
  await expect(anon.getByText(`by @${username}`)).toBeVisible()
  await expect(anon.frameLocator(PREVIEW).getByRole('heading', { name: 'My tasks' })).toBeVisible()

  // Make it private again: the same link must stop working
  await page.getByRole('button', { name: 'Public', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Private', exact: true })).toBeVisible()
  await anon.reload()
  await expect(anon.getByText('This project does not exist, or it is private.')).toBeVisible()
  await visitor.close()

  // Clean up by deleting the account
  await page.goto('/settings')
  await page.getByLabel('Password to confirm').fill(PASSWORD)
  await page.getByRole('button', { name: 'Delete my account' }).click()
  await page.getByRole('button', { name: 'Delete forever' }).click()
  await expect(page).toHaveURL(/\/$/)
})

