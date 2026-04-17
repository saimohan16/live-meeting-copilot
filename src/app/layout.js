import '../globals.css';

export const metadata = {
  title: 'Meeting Copilot — Live Suggestions',
  description: 'AI meeting copilot with real-time suggestions',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
