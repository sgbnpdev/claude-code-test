import { useState, useEffect } from 'react'
import './App.css'

const learnLinks = [
  { label: "AI Builder's Circle - Free Newsletter", href: '#' },
  { label: '10x Your AI Coding Prompts', href: '#' },
  { label: 'Work Directly With Me', href: '#' },
]

const socialLinks = [
  { label: 'YouTube', href: '#', icon: YouTubeIcon },
  { label: 'Twitter (X)', href: '#', icon: TwitterIcon },
  { label: 'Instagram', href: '#', icon: InstagramIcon },
]

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function LinkButton({ href, children, delay }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-fadein block w-full text-center py-3 px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors duration-200 text-sm sm:text-base"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </a>
  )
}

function SocialButton({ href, label, Icon, delay }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-fadein flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold border-2 border-[#2563eb] text-[#2563eb] dark:text-[#60a5fa] dark:border-[#60a5fa] hover:bg-[#2563eb] hover:text-white dark:hover:bg-[#1d4ed8] dark:hover:text-white transition-colors duration-200 text-sm sm:text-base"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon />
      {label}
    </a>
  )
}

export default function App() {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [dark])

  return (
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#121212] transition-colors duration-300 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8">

        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(d => !d)}
          className="self-end text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? '☀ Light' : '☾ Dark'}
        </button>

        {/* Profile picture */}
        <img
          src="https://placehold.co/150x150/2563eb/ffffff?text=YT"
          alt="Channel profile picture"
          width={150}
          height={150}
          className="rounded-full object-cover ring-4 ring-[#2563eb]/30"
        />

        {/* Channel name & bio */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            Your YouTube Channel
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
            I help developers build smarter with AI. Join the community, level up your coding skills, and let's create something amazing together.
          </p>
        </div>

        {/* Learn AI Coding */}
        <div className="w-full space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center">
            Learn AI Coding
          </h2>
          <div className="flex flex-col gap-3">
            {learnLinks.map((link, i) => (
              <LinkButton key={link.label} href={link.href} delay={i * 80}>
                {link.label}
              </LinkButton>
            ))}
          </div>
        </div>

        {/* Find Me Here */}
        <div className="w-full space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-center">
            Find Me Here
          </h2>
          <div className="flex flex-col gap-3">
            {socialLinks.map((link, i) => (
              <SocialButton
                key={link.label}
                href={link.href}
                label={link.label}
                Icon={link.icon}
                delay={(learnLinks.length + i) * 80}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
