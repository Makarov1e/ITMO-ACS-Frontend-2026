#!/usr/bin/env bash
set -euo pipefail
cd '/home/ubuntu/frontend-course/labs/К3440/Макаров Егор/lab2'
npm run reset-db
npm run build
npm test
npm run test:e2e
npm run test:a11y
