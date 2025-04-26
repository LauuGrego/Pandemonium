# Pandemonium

Pandemonium is a web application that displays daily news, integrates a vintage-inspired design, and includes a music player. The backend fetches and processes news from external APIs.

## Features

- **Daily News**: Fetches and displays the latest news articles.
- **Vintage Design**: A retro-inspired UI with custom fonts and gradients.
- **Music Player**: A simple music player with playback controls.
- **Responsive Design**: Optimized for desktop and mobile devices.
- **Server Monitoring**: Includes a `/health` endpoint to monitor server status.

## Project Structure

```
Pandemonium/
├── backend/               # Backend server files
│   ├── server.js          # Main server file
│   ├── news-scraper.js    # News fetching and processing logic
│   └── requirements.txt   # Backend dependencies
├── js/                    # Frontend JavaScript files
│   └── daily-notice.js
│   └── navbar_mobile.js   # A hamburger menu for mobile
│   └── player_buttons.js  # Functionality for media buttons
├── index.html             
├── styles.css             # Main CSS file for styling
├── yarn.lock              # Yarn lock file for dependencies
├── package.json           # Node.js dependencies and scripts
└── README.md              # Project documentation
```

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Yarn](https://yarnpkg.com/) (v1 or higher)

### Steps

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Pandemonium
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start the backend server:
   ```bash
   node backend/server.js
   ```

4. Open the frontend in your browser by serving the HTML file or using a local server.

## API Endpoints

### `/news`
Fetches the latest news articles from external APIs.

- **Method**: `GET`
- **Response**: JSON array of news articles.

### `/health`
Monitors the server's status.

- **Method**: `GET`
- **Response**: JSON object with `status` and `timestamp`.

## Development

### Backend
The backend is built with Express.js and includes the following dependencies:
- `axios`: For making HTTP requests.
- `cheerio`: For scraping and parsing HTML.
- `cors`: For enabling cross-origin requests.
- `express`: For creating the server.
- `ffmpeg-static` and `fluent-ffmpeg`: For handling media files.
- `multer`: For file uploads.

### Frontend
The frontend uses vanilla JavaScript and CSS for rendering news and styling.

## License

This project is licensed under the MIT License. See the `package.json` file for details.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Contact

For questions or feedback, please contact the project maintainer.