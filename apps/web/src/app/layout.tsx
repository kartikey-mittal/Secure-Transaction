import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Secure TX — Encrypted Transactions",
    description:
        "A secure transaction service with envelope encryption (AES-256-GCM)",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>{children}</body>
        </html>
    );
}
