import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={ title:"BECOME A CHEF", description:"Cook something worth serving with the ingredients you already have.", icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
