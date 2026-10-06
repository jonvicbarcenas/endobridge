# Synthetic lab input images

These PNGs are test fixtures, not patient records or clinical evidence. Upload one image at a time through **Lab result upload**, review the extracted values, and compare them with the table below. Each image contains all ten values in the current fixed lab panel.

| Image | Total testosterone (ng/dL) | Triglycerides (mg/dL) | Fasting glucose (mg/dL) | Total cholesterol (mg/dL) | HDL-C (mg/dL) | LDL-C (mg/dL) | TSH (mIU/L) | Free T3 (pg/mL) | Free T4 (ng/dL) | HbA1c (%) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `test-1-baseline.png` | 45 | 110 | 88 | 175 | 62 | 91 | 2.1 | 3.1 | 1.2 | 5.2 |
| `test-2-metabolic.png` | 50 | 245 | 126 | 260 | 38 | 175 | 2.3 | 3.0 | 1.1 | 6.5 |
| `test-3-thyroid.png` | 62 | 125 | 93 | 184 | 55 | 104 | 8.6 | 2.0 | 0.6 | 5.5 |
| `test-4-mixed.png` | 95 | 175 | 112 | 215 | 44 | 140 | 0.2 | 5.2 | 2.1 | 5.9 |

The images use `A1C` or `HbA1c` as equivalent report labels. Local OCR extraction was checked against every value in this table. Test 3's A1C number needed the scanner's decimal-review normalization, so confirm that its extracted confidence is marked `medium` before applying it.

Do not include these synthetic results in participant analysis or present them as real clinical findings. For a capstone usability evaluation, respondents can test with these fixtures; any study using real health records needs the school's ethics process and a privacy/consent plan.
