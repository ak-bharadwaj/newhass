export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Terms of Service</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="space-y-6 text-slate-700">
          <p>
            By using this system you agree to comply with applicable laws and organizational policies, including the
            protection of patient data and responsible use of clinical features.
          </p>
          <p>
            Unauthorized access, data extraction, or attempts to circumvent security controls are prohibited and may
            result in access revocation and legal action.
          </p>
          <p>
            For questions about these terms, contact <a className="underline text-slate-900" href="mailto:legal@example.com">legal@example.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
