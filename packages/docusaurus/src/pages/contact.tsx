import Link from '@docusaurus/Link'
import Translate from '@docusaurus/Translate'
import Layout from '@theme/Layout'
import React from 'react'

/**
 * Contact page component that displays various ways to contact the UTags team
 * @returns Contact page component
 */
export default function Contact(): React.ReactElement {
  return (
    <Layout
      title="Contact Us"
      description="UTags Contact Information - Reach us through GitHub Issues, community discussions and more">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1 className="text--center margin-bottom--lg">Contact Us</h1>

            <div className="margin-bottom--lg">
              <p>
                Thank you for your interest in UTags! If you have any questions,
                suggestions, or feedback, you can contact us through the
                following channels:
              </p>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>GitHub Issues</h2>
              </div>
              <div className="card__body">
                <p>
                  If you've found a bug or have a feature suggestion, please
                  submit it through GitHub Issues. This is our primary way of
                  tracking issues and improvements.
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://github.com/utags/utags/issues">
                    Submit an Issue
                  </Link>
                </div>
              </div>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>GitHub Discussions</h2>
              </div>
              <div className="card__body">
                <p>
                  For general discussions, questions, or sharing ideas, feel
                  free to join our GitHub Discussions.
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://github.com/utags/utags/discussions">
                    Join the Discussion
                  </Link>
                </div>
              </div>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>Greasy Fork</h2>
              </div>
              <div className="card__body">
                <p>
                  If you're using the UTags script from Greasy Fork, you can
                  leave comments and feedback there.
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback">
                    Greasy Fork Feedback
                  </Link>
                </div>
              </div>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>LINUX.DO</h2>
              </div>
              <div className="card__body">
                <p>
                  You can also discuss UTags-related topics in the LINUX.DO
                  community.
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://linux.do/t/topic/903643">
                    LINUX.DO Discussion
                  </Link>
                </div>
              </div>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>V2EX</h2>
              </div>
              <div className="card__body">
                <p>
                  On V2EX, you can find discussions and user feedback about
                  UTags.
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://www.v2ex.com/t/924103">
                    V2EX Discussion
                  </Link>
                </div>
              </div>
            </div>

            <div className="margin-top--lg">
              <p className="text--center">
                We'll respond to your questions and feedback as soon as
                possible. Thank you for your support of UTags!
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
