# UTRABot - Proof of Impact Platform

A full-stack application for verifying and minting impact certificates as NFTs on Solana blockchain using AI verification.

## Project Structure

```
UTRABot/
├── backend/          # Express.js API server
│   ├── src/
│   │   └── index.js
│   └── package.json
├── frontend/         # Next.js React application
│   ├── app/
│   └── package.json
└── README.md
```

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git**

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ZayaanB/UTRABot.git
cd UTRABot
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your actual credentials
# You'll need:
# - Google Gemini API key
# - Solana private key (base58 encoded)
```

#### Backend Dependencies

The backend uses the following key packages:
- `express` - Web framework
- `@google/genai` - Google Gemini AI integration
- `@solana/web3.js` - Solana blockchain integration
- `@metaplex-foundation/js` - NFT minting on Solana
- `multer` - File upload handling
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `uuid` - Unique ID generation
- `bs58` - Base58 encoding/decoding

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file (if needed)
cp .env.local.example .env.local
```

#### Frontend Dependencies

The frontend uses:
- `next` (v14.2.5) - React framework
- `react` (v18.3.1) - UI library
- `react-dom` (v18.3.1) - React DOM rendering

## Environment Variables

### Backend (.env)

Create a `backend/.env` file with the following variables:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_here
SOLANA_NETWORK=devnet
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key_here
CONFIDENCE_THRESHOLD=0.75
```

### Frontend (.env.local)

Check `frontend/.env.local.example` for required frontend environment variables.

## Running the Application

### Development Mode

You'll need two terminal windows:

#### Terminal 1 - Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:4000`

#### Terminal 2 - Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

- `GET /health` - Health check
- `POST /api/upload` - Upload image and description
- `POST /api/verify/:id` - Verify uploaded content with AI
- `POST /api/mint/:id` - Mint NFT certificate
- `GET /api/cert/:id` - Get certificate data
- `GET /api/cert/:id/image` - Get certificate image
- `POST /api/admin/cleanup` - Manual cleanup trigger

## Features

- 📸 **Image Upload** - Upload proof of impact images
- 🤖 **AI Verification** - Verify images using Google Gemini AI
- 🪙 **NFT Minting** - Mint verified impact as NFTs on Solana
- 📜 **Certificate Generation** - Generate shareable impact certificates
- 🔐 **Wallet Integration** - Connect Solana wallets

## Tech Stack

### Backend
- Node.js + Express
- Google Gemini AI
- Solana Web3.js
- Metaplex (NFT minting)

### Frontend
- Next.js 14
- React 18
- TypeScript (if configured)

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 4000 (backend)
   lsof -ti:4000 | xargs kill -9
   
   # Kill process on port 3000 (frontend)
   lsof -ti:3000 | xargs kill -9
   ```

2. **Module not found errors**
   ```bash
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Environment variables not loading**
   - Ensure `.env` files are in the correct directories
   - Restart the development servers after changing `.env` files

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
