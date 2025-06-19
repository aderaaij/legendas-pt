import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - LegendasPT',
  description: 'Terms of service for LegendasPT Portuguese language learning application',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Last updated: December 19, 2024</p>

          <div className="prose prose-gray max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Agreement to Terms</h2>
            <p className="mb-4">
              By accessing or using LegendasPT (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Description of Service</h2>
            <p className="mb-4">LegendasPT is a Portuguese language learning application that:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Extracts useful phrases from subtitle files for language learning</li>
              <li>Provides translation and context for Portuguese phrases</li>
              <li>Offers spaced repetition learning features</li>
              <li>Allows users to favorite and export phrases for study</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">User Accounts</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Account Creation</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Account Types</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Regular Users:</strong> Can browse content, favorite phrases, and use learning features</li>
              <li><strong>Administrators:</strong> Additional privileges to upload content and manage the platform</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Account Termination</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>You may delete your account at any time</li>
              <li>We may suspend or terminate accounts that violate these Terms</li>
              <li>Upon termination, your data will be deleted in accordance with our Privacy Policy</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Acceptable Use</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">You May</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Use the Service for personal language learning purposes</li>
              <li>Favorite phrases and track your learning progress</li>
              <li>Export your personal data and learning progress</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">You May Not</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to the system</li>
              <li>Upload malicious content or attempt to harm the Service</li>
              <li>Share your account credentials with others</li>
              <li>Use the Service to violate any applicable laws or regulations</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Content and Intellectual Property</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">User Content</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>You retain ownership of any content you create or upload</li>
              <li>By using the Service, you grant us a license to store and process your data as described in our Privacy Policy</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Service Content</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>All subtitle content and extracted phrases are processed for educational purposes</li>
              <li>TV show metadata is obtained from The TVDB under their terms of use</li>
              <li>The Service&apos;s code and design are protected by intellectual property laws</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Copyright Compliance</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>We respect intellectual property rights</li>
              <li>If you believe content infringes your copyright, contact us with details for review</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Learning Data and Progress</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Collection</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>We collect and store your learning progress to provide spaced repetition features</li>
              <li>This includes study sessions, review performance, and scheduling data</li>
              <li>All data collection is described in our Privacy Policy</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Data Accuracy</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Learning progress tracking is provided for convenience and motivation</li>
              <li>We make no guarantees about the educational effectiveness of any particular method</li>
              <li>Language learning results may vary between individuals</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Service Availability</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Availability</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>We strive to maintain service availability but cannot guarantee 100% uptime</li>
              <li>The Service may be temporarily unavailable for maintenance or technical issues</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Modifications</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>We may modify, suspend, or discontinue features at any time</li>
              <li>We will provide reasonable notice for significant changes when possible</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Privacy and Data Protection</h2>
            <p className="mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, use, and protect your information. By using the Service, you agree to the collection and use of information in accordance with our Privacy Policy.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Disclaimer of Warranties</h2>
            <p className="mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>The Service will meet your specific requirements</li>
              <li>The Service will be uninterrupted or error-free</li>
              <li>Any learning outcomes or results will be achieved</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Indemnification</h2>
            <p className="mb-4">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h2>
            <p className="mb-4">
              These Terms are governed by the laws of [Your jurisdiction]. Any disputes will be resolved in the courts of [Your jurisdiction].
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
            <p className="mb-4">We may update these Terms from time to time. We will notify users of any material changes by:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Posting the updated Terms on the Service</li>
              <li>Updating the &quot;Last updated&quot; date</li>
              <li>Providing notice through the Service or via email for significant changes</li>
            </ul>
            <p className="mb-4">
              Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
            <p className="mb-4">If you have any questions about these Terms of Service, please contact us at:</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Email:</strong> [Your contact email]</li>
              <li><strong>Address:</strong> [Your business address if applicable]</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Entire Agreement</h2>
            <p className="mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and LegendasPT regarding the Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}