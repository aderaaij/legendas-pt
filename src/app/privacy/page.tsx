import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - LegendasPT',
  description: 'Privacy policy for LegendasPT Portuguese language learning application',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: December 19, 2024</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Introduction</h2>
            <p className="mb-4">
              LegendasPT (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Portuguese language learning application.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Account Information</h3>
            <p className="mb-4">When you create an account, we collect:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Email address</strong> - Used for authentication and account management</li>
              <li><strong>Password</strong> - Securely hashed and stored (we cannot see your actual password)</li>
              <li><strong>Account role</strong> - User or admin designation for access control</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Learning Data</h3>
            <p className="mb-4">When you use our learning features, we collect:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Phrase favorites</strong> - Portuguese phrases you&apos;ve marked as favorites</li>
              <li><strong>Study progress</strong> - Your learning sessions, including:
                <ul className="list-disc pl-6 mt-2">
                  <li>Cards studied and review performance</li>
                  <li>Study session duration and accuracy</li>
                  <li>Spaced repetition scheduling data</li>
                  <li>Review ratings and timing information</li>
                </ul>
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Technical Information</h3>
            <p className="mb-4">We automatically collect:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Usage data</strong> - How you interact with the application</li>
              <li><strong>Performance data</strong> - Application performance and error information</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Provide authentication</strong> - Secure access to your account</li>
              <li><strong>Track learning progress</strong> - Maintain your study history and spaced repetition scheduling</li>
              <li><strong>Improve the service</strong> - Analyze usage patterns to enhance the application</li>
              <li><strong>Communicate with you</strong> - Send important account and service updates</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Storage and Security</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Storage</h3>
            <p className="mb-4">
              Your data is stored securely using Supabase, a trusted database provider that complies with industry security standards.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Security Measures</h3>
            <p className="mb-4">We implement appropriate technical and organizational measures to protect your personal data, including:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls and authentication</li>
              <li>Regular security monitoring</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Sharing</h2>
            <p className="mb-4">We do not sell, trade, or rent your personal information to third parties. We may share your information only:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>With service providers</strong> - Supabase for data storage and authentication</li>
              <li><strong>For legal compliance</strong> - When required by law or to protect our legal rights</li>
              <li><strong>For TV show metadata</strong> - We query The TVDB API for show information, but do not share your personal data</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Your Rights (GDPR)</h2>
            <p className="mb-4">If you are located in the European Union, you have the following rights:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Access</strong> - Request a copy of the personal data we hold about you</li>
              <li><strong>Rectification</strong> - Request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure</strong> - Request deletion of your personal data</li>
              <li><strong>Data Portability</strong> - Request your data in a portable format</li>
              <li><strong>Objection</strong> - Object to processing of your personal data</li>
            </ul>
            <p className="mb-4">To exercise these rights, contact us at [contact email].</p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data Retention</h2>
            <p className="mb-4">We retain your personal data only as long as necessary for the purposes outlined in this policy:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Account data</strong> - Until you delete your account</li>
              <li><strong>Learning data</strong> - Until you delete your account or request removal</li>
              <li><strong>Technical data</strong> - Up to 12 months for performance analysis</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Cookies</h2>
            <p className="mb-4">
              We use essential cookies for authentication and application functionality. These cookies are necessary for the service to work and do not require consent.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Children&apos;s Privacy</h2>
            <p className="mb-4">
              Our service is not intended for children under 16. We do not knowingly collect personal information from children under 16.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Changes to This Policy</h2>
            <p className="mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="mb-4">If you have any questions about this Privacy Policy, please contact us at:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Email:</strong> [Your contact email]</li>
              <li><strong>Address:</strong> [Your business address if applicable]</li>
            </ul>
            <p className="mb-4">
              For data protection inquiries specifically, you may also contact our Data Protection Officer at [DPO email if applicable].
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}