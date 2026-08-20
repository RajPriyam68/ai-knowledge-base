\# AI Knowledge Base



An AI-powered knowledge management platform that allows users to upload documents, process their content, search semantically, and ask questions using Retrieval-Augmented Generation (RAG) with source citations.



\## Overview



AI Knowledge Base combines document management, vector search, and generative AI to provide a conversational interface over a user's own documents.



Users can upload PDF, DOCX, TXT, and Markdown files. The system extracts and processes the content, creates embeddings, stores them in PostgreSQL with pgvector, retrieves relevant chunks, and generates grounded answers with citations.



\## Key Features



\- User registration and authentication

\- JWT-based authentication

\- Knowledge base creation and management

\- PDF, DOCX, TXT, and Markdown document support

\- Document processing and chunking

\- Semantic vector search

\- Retrieval-Augmented Generation (RAG)

\- AI-generated answers with source citations

\- Chat history and follow-up questions

\- Document reprocessing

\- Knowledge-base archiving and restoration

\- Knowledge-base member permissions

\- Notifications

\- Admin dashboard

\- User management

\- System logs

\- Analytics and API usage monitoring

\- AI model configuration

\- Prompt management

\- Health monitoring

\- Automated tests

\- Docker deployment configuration



\## RAG Pipeline



```text

Document Upload

&#x20;     ↓

Text Extraction

&#x20;     ↓

Text Cleaning

&#x20;     ↓

Document Chunking

&#x20;     ↓

Embedding Generation

&#x20;     ↓

PostgreSQL + pgvector

&#x20;     ↓

User Question

&#x20;     ↓

Query Embedding

&#x20;     ↓

Similarity Search

&#x20;     ↓

Relevant Context

&#x20;     ↓

LLM

&#x20;     ↓

Answer + Source Citations





\#Technology Stack

Frontend

Next.js



React



TypeScript



Tailwind CSS



TanStack Query



Lucide Icons



Backend

Node.js



Express



TypeScript



Prisma ORM



JWT Authentication



Zod validation



AI / RAG

Google Gemini



Hugging Face / Transformers



all-MiniLM-L6-v2



Retrieval-Augmented Generation



Vector similarity search



Database

PostgreSQL



pgvector



Prisma



DevOps

Docker



Docker Compose



Git



GitHub



\#Project Structure

ai-knowledge-base/

├── backend/

│   ├── prisma/

│   ├── src/

│   │   ├── ai/

│   │   ├── controllers/

│   │   ├── jobs/

│   │   ├── middleware/

│   │   ├── repositories/

│   │   ├── routes/

│   │   ├── services/

│   │   ├── storage/

│   │   └── utils/

│   └── tests/

│

├── frontend/

│   ├── app/

│   │   ├── (admin)/

│   │   ├── (app)/

│   │   └── (auth)/

│   ├── components/

│   └── lib/

│

├── docs/

├── docker-compose.yml

├── package.json

└── README.md

\#Prerequisites

Node.js 22+



npm



PostgreSQL 17 with pgvector



Docker is optional for local development.



Installation

Clone the repository:



git clone https://github.com/RajPriyam68/ai-knowledge-base.git

cd ai-knowledge-base

Install dependencies:



npm install

Environment Configuration

Create the backend environment file.



Windows PowerShell

Copy-Item backend/.env.example backend/.env

Configure the database, JWT, and AI settings in backend/.env.



For Gemini-based generation:



GEMINI\_API\_KEY=your\_api\_key

Never commit .env files or API keys to GitHub.



\#Database Setup

Run Prisma migrations:



npm run db:migrate

Optional seed:



npm run db:seed

Development

Start both frontend and backend:



npm run dev

Or separately:



npm run dev:backend

npm run dev:frontend

Default development URLs:



Frontend: http://localhost:3000

Backend:  http://localhost:5000

API:      http://localhost:5000/api



\#Quality Checks

Lint:



npm run lint

Format:



npm run format

Tests:



npm test

Build:



npm run build

Docker

Start the complete stack:



docker compose up --build -d

Stop the stack:



docker compose down

Detailed deployment instructions:



\#Deployment Guide



\#Admin Features

Administrators can manage:



Users



User roles and suspension



System logs



Analytics



API usage



Application settings



AI configuration



Prompt templates



System health



\*Security

The application includes:



JWT authentication



Refresh-token sessions



Password hashing



Role-based authorization



Knowledge-base permissions



Request validation



Rate limiting



Protected admin routes



CORS configuration



Upload restrictions



Environment-based secrets



Sensitive configuration must always be stored in environment variables.



\#Documentation

Deployment Guide



Final Audit Report



Known Limitations



Project Ready Checklist



Known Limitations

See:



Known Limitations



\*Future Scope

Multi-provider LLM support



Advanced OCR



Streaming AI responses



Hybrid keyword + vector retrieval



Advanced reranking



Team and organization workspaces



Cloud object storage



Enterprise SSO



Advanced observability



Production deployment automation



\*Project Status

Production-oriented MVP



The project currently provides the core authentication, document management, RAG, AI chat, administration, analytics, testing, and deployment foundations.



\*License

This project is currently intended for educational, portfolio, and project-development purposes.

