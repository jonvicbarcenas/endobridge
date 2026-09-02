import { expect, test, type Locator } from '@playwright/test'

function pdfBuffer() {
  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 147 >>
stream
BT /F1 14 Tf 72 720 Td (LDL-C 132 mg/dL) Tj 0 -20 Td (Fasting Glucose 101 mg/dL) Tj 0 -20 Td (Fasting Insulin 18 uIU/mL) Tj 0 -20 Td (Total Testosterone 62 ng/dL) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000241 00000 n
0000000438 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
508
%%EOF`)
}

async function selectFirstRealOption(locator: Locator) {
  const options = await locator.locator('option').evaluateAll((items) =>
    items.map((item) => (item as HTMLOptionElement).value).filter(Boolean),
  )
  if (options[0]) await locator.selectOption(options[0])
}

async function completeQuestionnaire(page: import('@playwright/test').Page) {
  for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
    for (const input of await page.locator('form input[type="number"]').all()) {
      if (!(await input.inputValue())) await input.fill('1')
    }
    for (const input of await page.locator('form input[type="date"]').all()) {
      if (!(await input.inputValue())) await input.fill('2026-05-01')
    }
    for (const select of await page.locator('form select').all()) {
      if (!(await select.inputValue())) await selectFirstRealOption(select)
    }
    for (const checkbox of await page.locator('form input[type="checkbox"]').all()) {
      if (!(await checkbox.isChecked())) await checkbox.check()
    }
    for (const textarea of await page.locator('form textarea').all()) {
      if (!(await textarea.inputValue())) await textarea.fill('No additional concerns')
    }

    const nextButton = page.getByRole('button', { name: 'Next section' })
    if (await nextButton.isVisible()) {
      await nextButton.click()
      continue
    }

    await page.getByRole('button', { name: 'Save session' }).click()
    return
  }
  throw new Error('questionnaire exceeded expected page count')
}

test('registers, accepts terms, tracks monitoring data, uploads PDF, and shows history', async ({ page }) => {
  const legacyInsightResponse = await page.request.post('http://127.0.0.1:3100/api/generate-insight', { data: {} })
  expect(legacyInsightResponse.status()).toBe(401)

  await page.goto('/')

  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Email address').fill(`e2e-${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('Password123!')
  await page.getByLabel('Confirm password').fill('Password123!')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Terms, privacy consent, and safety disclaimer')).toBeVisible()
  await page.getByLabel('I accept the EndoBridge Terms of Use.').check()
  await page.getByLabel('I consent to secure account storage for my submitted monitoring records.').check()
  await page.getByLabel('I confirm that I am at least 18 years old.').check()
  await page.getByLabel(/I understand that EndoBridge is not medical advice/).check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()
  await expect(page).toHaveURL(/dashboard/)

  const token = await page.evaluate(() => sessionStorage.getItem('endobridge.sessionToken'))
  expect(token).toBeTruthy()
  const invalidRecordResponse = await page.request.post('http://127.0.0.1:3100/api/daily-logs', {
    headers: { Authorization: `Bearer ${token}` },
    data: { attackerControlled: true },
  })
  expect(invalidRecordResponse.status()).toBe(400)

  await page.goto('/lab')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'e2e-lab-result.pdf',
    mimeType: 'application/pdf',
    buffer: pdfBuffer(),
  })
  await expect(page.getByText(/PDF stored|PDF scanned|personal record/i)).toBeVisible()
  await page.getByRole('button', { name: 'Apply extracted values' }).click()
  await page.getByLabel('Age').fill('28')
  await page.getByLabel('AMH').fill('7.2')
  await page.getByLabel('LH/FSH ratio').fill('1.7')
  await page.getByLabel('DHEAS').fill('320')
  await page.getByRole('button', { name: 'Continue to questionnaire' }).click()
  await expect(page.getByText('Standard questionnaire')).toBeVisible()

  await completeQuestionnaire(page)
  await expect(page).toHaveURL(/history\//)
  await expect(page.getByText('Questionnaire answers')).toBeVisible()

  await page.goto('/symptoms')
  await page.getByLabel('Acne severity').selectOption('moderate')
  await page.getByRole('button', { name: /save symptom/i }).click()
  await expect(page.getByText('Saved symptom log to your account.')).toBeVisible()

  await page.goto('/medications')
  await page.getByLabel('Medication name').fill('Prescribed medication')
  await page.getByLabel('Dosage').fill('500 mg')
  await page.getByLabel('Schedule time').fill('08:30')
  await page.getByRole('button', { name: 'Save reminder' }).click()
  await expect(page.getByText('Medication reminder saved to your account.')).toBeVisible()

  await page.goto('/daily')
  await page.getByLabel('Symptoms note').fill('Mild fatigue')
  await page.getByRole('button', { name: 'Save daily log' }).click()
  await expect(page.getByText('Daily wellness log saved to your account.')).toBeVisible()

  await page.goto('/history')
  await expect(page.getByText('Account history')).toBeVisible()
  await expect(page.getByText(/1 daily logs?/)).toBeVisible()
  await expect(page.getByText(/1 lab result file/)).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).first().click()
  await expect(page.getByRole('heading', { name: 'Log in to EndoBridge' })).toBeVisible()
  const revokedProfileResponse = await page.request.get('http://127.0.0.1:3100/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(revokedProfileResponse.status()).toBe(401)
})
