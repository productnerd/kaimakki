export default function HowItWorks() {
  return (
    <section className="mt-16">
      <h2 className="font-display font-bold text-2xl text-cream mb-8">How it works</h2>
      <div className="max-w-2xl mx-auto">
        {/* Onboarding steps (linear) */}
        {[
          { icon: "🛒", title: "Start with 3+ videos", desc: "Choose 3+ video recipes that fit your goals. Mix and match, or grab a bundle." },
          { icon: "📋", title: "Fill in the questionnaire", desc: "Answer a few questions about your brand, audience, and goals so we know what we're working with." },
          { icon: "🧠", title: "Strategy session + meet your account manager", desc: "A 1-on-1 call with a real human. We map out your content pillars, topics, posting cadence, and game plan. You also get a dedicated account manager and a direct channel - questions, feedback, weird requests - they've got you." },
          { icon: "📦", title: "Your strategy pack", desc: "After the session, you get your video branding guidelines (visual style, colours, animation, pacing, music direction), a content calendar, and all the video ideas - ready to go." },
        ].map((s, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm shrink-0">
                {s.icon}
              </div>
              <div className="w-px flex-1 bg-border my-1" />
            </div>
            <div className="pb-6">
              <h3 className="font-display font-bold text-sm text-cream">{s.title}</h3>
              <p className="text-cream-61 text-xs mt-1">{s.desc}</p>
            </div>
          </div>
        ))}

        {/* Repeat loop */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-px bg-border" style={{ height: 8 }} />
          </div>
          <div />
        </div>
        <div className="relative ml-4 border border-accent/20 rounded-brand p-5 pl-8 mb-2">
          {/* Loop label */}
          <div className="absolute -top-3 left-4 bg-accent border border-accent rounded-full px-3 py-0.5 flex items-center">
            <span className="text-[10px] text-background font-medium leading-none">↩ Pick more videos &amp; repeat</span>
          </div>

          {[
            { icon: "🎬", title: "Film your footage", desc: "We send you a shot list for each video. You film on your phone. No fancy gear needed." },
            { icon: "📤", title: "Send us the footage", desc: "Upload your clips. We take it from here." },
            { icon: "✂️", title: "We edit", desc: "Our editors turn your footage into scroll-stoppers using your branding guidelines." },
            { icon: "🔄", title: "Review + 1 free revision", desc: "Watch your video. Don't love something? Give feedback and we'll revise it once - on us." },
            { icon: "🚀", title: "You post (or else)", desc: "Get your final video and post it within 30 days. Ghost us? We donate part of your prepayment to charity. You're welcome." },
          ].map((s, i, arr) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm shrink-0">
                  {s.icon}
                </div>
                {i < arr.length - 1 && (
                  <div className="w-px flex-1 bg-accent/20 my-1" />
                )}
              </div>
              <div className={i < arr.length - 1 ? "pb-5" : ""}>
                <h3 className="font-display font-bold text-sm text-cream">{s.title}</h3>
                <p className="text-cream-61 text-xs mt-1">{s.desc}</p>
              </div>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}
