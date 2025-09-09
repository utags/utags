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
      title="联系我们"
      description="UTags 联系方式 - 通过 GitHub Issues、社区讨论等方式联系我们">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1 className="text--center margin-bottom--lg">联系我们</h1>

            <div className="margin-bottom--lg">
              <p>
                感谢您对 UTags
                的关注！如果您有任何问题、建议或反馈，可以通过以下方式联系我们：
              </p>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>GitHub Issues</h2>
              </div>
              <div className="card__body">
                <p>
                  如果您发现了 bug 或有功能建议，请通过 GitHub Issues
                  提交。这是我们跟踪问题和改进的主要方式。
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://github.com/utags/utags/issues">
                    提交 GitHub Issue
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
                  对于一般性讨论、问题或想法分享，欢迎加入我们的 GitHub
                  Discussions 社区。
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://github.com/utags/utags/discussions">
                    参与讨论
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
                  如果您使用的是 Greasy Fork 上的 UTags
                  脚本，可以在那里留下评论和反馈。
                </p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://greasyfork.org/scripts/460718-utags-add-usertags-to-links/feedback">
                    Greasy Fork 反馈
                  </Link>
                </div>
              </div>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>LINUX.DO</h2>
              </div>
              <div className="card__body">
                <p>您也可以在 LINUX.DO 社区讨论 UTags 相关话题。</p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://linux.do/t/topic/903643">
                    LINUX.DO 讨论
                  </Link>
                </div>
              </div>
            </div>

            <div className="card margin-bottom--md">
              <div className="card__header">
                <h2>V2EX</h2>
              </div>
              <div className="card__body">
                <p>在 V2EX 上，您可以找到关于 UTags 的讨论和用户反馈。</p>
                <div className="button-group button-group--block">
                  <Link
                    className="button button--primary"
                    to="https://www.v2ex.com/t/924103">
                    V2EX 讨论
                  </Link>
                </div>
              </div>
            </div>

            <div className="margin-top--lg">
              <p className="text--center">
                我们会尽快回复您的问题和反馈。感谢您对 UTags 的支持！
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
