# Spiritual Baptist Hymnal App

A digital hymnal application for Spiritual Baptist hymns and choruses, built with Next.js and available as a Progressive Web App (PWA).

## Features

- **Hymn Browser**: Easily browse through hymns with numerical pagination
- **Multiple Views**: Separate tabs for hymns, choruses, favorites, and recently viewed
- **Search Functionality**: Search by title, number, lyrics, author, or category
- **Editing Capabilities**: Add, edit and manage hymns and choruses
- **Offline Support**: Access hymns even without an internet connection
- **PWA Integration**: Install the app on mobile devices for a native-like experience
- **Responsive Design**: Works well on desktop, tablet, and mobile devices

## Technical Implementation

- Built with Next.js framework
- UI components from shadcn/ui component library
- Progressive Web App (PWA) with next-pwa
- File-based hymn storage with JSON
- Offline functionality with localStorage caching
- Responsive design using Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/spiritual-baptist-hymnal.git
   cd spiritual-baptist-hymnal
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Generate PWA icons (requires ImageMagick):
   ```
   node scripts/generate-icons.js
   ```

4. Run the development server:
   ```
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Adding Your Own Hymns

Place JSON hymn files in a `hymns` directory in the project root. Each file should follow this format:

```json
{
  "hymnNumber": "123",
  "title": "Hymn Title",
  "author": {
    "name": "Author Name",
    "birthYear": "1900",
    "deathYear": "1980", 
    "bio": "Brief author biography"
  },
  "category": "Praise",
  "lyrics": "First verse lyrics\n\nSecond verse lyrics"
}
```

For choruses, use hymn numbers prefixed with "s" (e.g., "s1", "s2").

## Deployment

This app can be deployed on Vercel:

1. Push your code to GitHub.
2. Connect your repository to Vercel.
3. Deploy with default settings.

### Important Note About Data Storage

When deployed on Vercel, the app uses an ephemeral filesystem, which means:

- Any hymns added or edited through the app interface will be stored only until the next deployment
- After redeployment, the app will revert to using the hymns included in the repository's `hymns` directory
- Users' favorites and recently viewed lists will persist in their browsers' localStorage

For a production environment that requires permanent hymn storage:
- Consider implementing a database solution (MongoDB, MySQL, etc.)
- Use a file storage service like AWS S3 or Firebase Storage
- For simpler needs, you could use a CMS or even a GitHub-based workflow to update the hymns

## License

[MIT License](LICENSE)

## Acknowledgements

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- PWA support with [next-pwa](https://github.com/shadowwalker/next-pwa) 