import React from "react";
import { Link } from "wouter";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Addis Ababa City Administration Bureau of Youth and Sport
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: October 2023
          </p>
        </div>

        <div className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert mx-auto">
          <h2>1. Introduction</h2>
          <p>
            Welcome to the Woreda 11 Club Attendance Management System. This privacy policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>

          <h2>2. Information We Collect</h2>
          <p>
            We may collect personal identification information such as your name, email address, phone number, and club affiliation when you register or interact with the platform.
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>
            We use the information we collect to manage club attendance, generate administrative reports, improve our services, and communicate with club managers regarding system updates.
          </p>

          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored securely on servers authorized by the Addis Ababa City Administration. We implement industry-standard security measures to protect against unauthorized access or data breaches.
          </p>

          <h2>5. Data Sharing</h2>
          <p>
            We do not sell or rent your personal information to third parties. Information may be shared with relevant government departments solely for administrative and reporting purposes.
          </p>

          <h2>6. User Rights</h2>
          <p>
            You have the right to request access to the personal data we hold about you, request corrections to inaccurate data, or request deletion under certain circumstances as permitted by law.
          </p>

          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of any material changes by posting the updated policy on this platform.
          </p>

          <h2>8. Contact Us</h2>
          <p>
            If you have questions about this privacy policy, please contact the Bureau of Youth and Sport administrator for Woreda 11.
          </p>
        </div>

        <div className="mt-12 text-center border-t border-border pt-8">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
