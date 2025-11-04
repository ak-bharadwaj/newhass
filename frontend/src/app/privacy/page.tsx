export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        <div className="space-y-6 text-slate-700">
          <p>
            We respect your privacy. We collect only the data needed to provide secure authentication and deliver
            healthcare workflows. We do not sell your data.
          </p>
          <p>
            Patient and staff data is protected in transit and at rest. Access is strictly role-based and audited.
          </p>
          <p>
            For data requests or concerns, email <a className="underline text-slate-900" href="mailto:privacy@example.com">privacy@example.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
