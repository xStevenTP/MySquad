# MySquad

A modern sports and esports team tracking dashboard. Follow your favorite teams across NBA, NFL, MLB, NHL, League of Legends, CS:GO, Valorant, and Dota 2.

## Features

- **Multi-Sport Support**: Track traditional sports (NBA, NFL, MLB, NHL) and esports (LoL, CS:GO, Valorant, Dota 2)
- **Live Games**: Real-time updates for ongoing games with auto-refresh every 30 seconds
- **Team Schedules**: View past, current, and upcoming games with scores and times
- **Smart Search**: Search across all leagues and add teams instantly
- **10 Team Limit**: Curate your dashboard with up to 10 favorite teams
- **Timezone Aware**: All game times displayed in your local timezone
- **Mobile Responsive**: Optimized for phones, tablets, and desktops
- **Secure Authentication**: Email-based auth powered by Supabase
- **Intelligent Caching**: DB-first architecture with aggressive caching to minimize API calls
- **Auto-Seed**: Automatically populates sports data on first deploy

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React 19** - UI library

### Backend
- **Supabase** - Database, authentication, and RLS policies
- **PostgreSQL** - Relational database with sports data caching
- **Next.js API Routes** - Server-side logic

### APIs
- **Highlightly** - Traditional sports data (100 req/day free with DB caching)
- **PandaScore** - Esports data (1000 req/hour free)

### Utilities
- **date-fns** - Timezone handling
- **Rate limiting** - API protection

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for sports data

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/mysquad.git
cd mysquad
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# API Keys
HIGHLIGHTLY_API_KEY=your-highlightly-key
PANDASCORE_KEY=your-pandascore-key
```

4. **Set up Supabase:**

See detailed instructions in [`supabase/SETUP.md`](supabase/SETUP.md)

- Create Supabase project
- Run migrations from `supabase/migrations/` (including 003_sports_cache.sql)
- Enable email authentication

5. **Get API Keys:**

- **Highlightly**: Sign up at https://highlightly.net (100 req/day free)
- **PandaScore**: Sign up at https://pandascore.co

6. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
mysquad/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── teams/          # Team management endpoints
│   │   └── leagues/        # League standings endpoints
│   ├── dashboard/          # Protected dashboard
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   └── layout.tsx          # Root layout
├── components/              # React components
│   ├── auth/               # Authentication forms
│   └── dashboard/          # Dashboard components
├── lib/                     # Utilities and libraries
│   ├── api/                # API clients
│   ├── auth/               # Auth helpers
│   ├── cache/              # Caching utilities
│   ├── supabase/           # Supabase clients
│   └── utils/              # General utilities
├── supabase/               # Database setup
│   └── migrations/         # SQL migration files
├── types/                  # TypeScript types
└── middleware.ts           # Auth middleware
```

## Usage

### Sign Up & Login

1. Navigate to the app
2. Click "Sign up" to create an account
3. Verify your email (check spam folder)
4. Log in with your credentials

### Adding Teams

1. Use the search bar on the dashboard
2. Type a team name (e.g., "Lakers", "Cloud9")
3. Select from results
4. Team added to your dashboard (max 10 teams)

### Viewing Schedules

- Each team card shows:
  - Past games with scores
  - Upcoming games with dates/times
  - Live games highlighted in green

### Live Games

- Banner appears automatically when games are live
- Auto-refreshes every 30 seconds
- Shows scores and game status

### Removing Teams

- Click the X button on any team card
- Team immediately removed from dashboard

## API Routes

See [`app/api/API_ROUTES.md`](app/api/API_ROUTES.md) for full API documentation.

**Main Endpoints:**
- `POST /api/teams/search` - Search teams
- `GET /api/teams` - Get user's teams
- `POST /api/teams/add` - Add team
- `DELETE /api/teams/[id]` - Remove team
- `GET /api/teams/[id]/schedule` - Get schedule
- `GET /api/teams/live` - Get live games
- `GET /api/leagues/[id]/standings` - Get standings

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/mysquad)

1. Click the button above
2. Set environment variables
3. Deploy!

## Features in Detail

### Caching Strategy

- **Team Data**: 1 hour cache
- **Schedules**: 1 hour cache
- **Standings**: 1 hour cache
- **Live Games**: 5 minute cache

Reduces API calls by 90%+ while maintaining data freshness.

### Rate Limiting

- Search: 50 requests/hour per IP
- Other endpoints: 100 requests/hour per IP

Prevents abuse and protects API keys.

### Security

- Row Level Security (RLS) in Supabase
- Users can only access their own teams
- 10 team limit enforced at DB level
- Server-side API keys (never exposed)
- HTTPS only

### Responsive Design

- **Mobile**: Single column layout
- **Tablet**: 2 column grid
- **Desktop**: 3 column grid
- Touch-friendly UI
- Optimized for all screen sizes

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

**Teams not loading:**
- Check Supabase connection
- Verify RLS policies are applied
- Check browser console for errors

**API errors:**
- Verify API keys are correct
- Check rate limits aren't exceeded
- Ensure environment variables are set

**Authentication issues:**
- Verify Supabase redirect URLs
- Check email provider settings
- Clear browser cookies and try again

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for more troubleshooting tips.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [Highlightly](https://highlightly.net) for sports data API
- [PandaScore](https://pandascore.co) for esports data
- [Supabase](https://supabase.com) for backend infrastructure
- [Vercel](https://vercel.com) for hosting

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review API provider docs

---

Built with ❤️ using Next.js and Supabase
