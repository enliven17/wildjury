import { IllosCiPipeline } from '../illos/ci-pipeline'

const YAML = `name: jury
on: pull_request
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx wildjury review --base origin/main
        env:
          OTARI_API_KEY: \${{ secrets.OTARI_API_KEY }}`

export default function Gate() {
  return (
    <section className="gate" id="ci">
      <div className="wrap feature">
        <div className="feature-copy">
          <h2 className="h2" data-split>
            Merge on a <em>verdict.</em>
          </h2>
          <p className="lede" data-rise>
            wildjury review exits 0 when the jury approves and 1 when it does not. Drop it into any pipeline and a pull request
            needs a majority of labs on its side before it lands.
          </p>
          <div className="gate-art" data-rise>
            <IllosCiPipeline className="illo" />
          </div>
        </div>
        <pre className="code" data-rise>
          <span className="code-file">.github/workflows/jury.yml</span>
          {YAML}
        </pre>
      </div>
    </section>
  )
}
