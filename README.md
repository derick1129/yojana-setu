# Yojana Setu — योजना सेतु

Government scheme discovery and application platform for Indian citizens. Built for hackathon demo.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Bun + Express + TypeScript
- **Database**: Neon (Postgres) + Prisma
- **OCR**: Tesseract.js · **LLM**: Google Gemini (`gemini-1.5-flash`)

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL (Neon), GEMINI_API_KEY (Google AI Studio)

bun install
bun run db:push
bun run db:generate
bun run dev
```

Backend: http://localhost:8000

### 2. Frontend

```bash
cd frontend
cp .env.example .env
bun install
bun run dev
```

Frontend: http://localhost:5173

## Demo flow

1. Fill profile (e.g. Farmer, 45, MP, ₹80k, SC, land + BPL)
2. View matched schemes + master document checklist
3. Apply to PM-KISAN — upload documents (OCR + Gemini validation)
4. Submit application → Track board
5. Click **Advance Status →** to move cards across Kanban columns

## API keys

- **Neon**: https://neon.tech — copy connection string to `DATABASE_URL`
- **Gemini**: https://aistudio.google.com — free API key
# yojana-setu
