export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight mb-3">About</h1>
        <p className="text-slate-600 mb-8">
          This system streamlines hospital operations with secure access, role-based workflows, and patient-first design.
          It brings together clinical documentation, prescriptions, labs, beds, appointments, and analytics in one place.
        </p>
        <div className="space-y-4 text-slate-700">
          <p>
            Our goal is to deliver a reliable, compliant, and modern experience for healthcare teams. The platform supports
            multi-hospital regions, granular permissions, and audit-ready activity logs.
          </p>
          <p>
            For press or partnership inquiries, contact us at <a className="underline text-slate-900" href="mailto:info@example.com">info@example.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
