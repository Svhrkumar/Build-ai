const Navbar = () => {
    return(
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/55 px-5 py-4 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1c7c7d,#5db9b3)] text-sm font-semibold text-white shadow-[0_16px_30px_rgba(28,124,125,0.28)]">
                        B
                    </div>
                    <div>
                        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">AI Studio</p>
                        <h1 className="text-lg font-semibold text-slate-900">Build.ai</h1>
                    </div>
                </div>

                <div className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm">
                    Component chat workspace
                </div>
            </div>
        </header>
    )
}

export default Navbar
