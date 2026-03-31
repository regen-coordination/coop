import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function WelcomeHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Community Docs</p>
        <h1 className={styles.heroTitle}>Welcome To Coop</h1>
        <p className={styles.heroSubtitle}>
          Capture scattered knowledge, refine it locally, and turn what matters into shared memory
          your coop can actually use.
        </p>
        <div className={styles.ctaRow}>
          <Link className={styles.buttonPrimary} to="/how-it-works">
            How It Works
          </Link>
          <Link className={styles.buttonSecondary} to="/creating-a-coop">
            Creating A Coop
          </Link>
        </div>
      </div>

      <div className={styles.heroArt}>
        <div className={styles.heroFlow}>
          <div className={styles.flowZone}>
            <div className={`${styles.flowCard} ${styles.scattered}`}>Research tab</div>
            <div className={`${styles.flowCard} ${styles.scattered}`}>Voice memo</div>
            <div className={`${styles.flowCard} ${styles.scattered}`}>Field note</div>
          </div>

          <div className={styles.flowCenter}>
            <img
              className={styles.heroMark}
              src="/branding/coop-mark-glow.png"
              alt="Coop organizes knowledge"
            />
          </div>

          <div className={styles.flowZone}>
            <div className={`${styles.flowCard} ${styles.organized}`}>Shared evidence</div>
            <div className={`${styles.flowCard} ${styles.organized}`}>Clear next step</div>
            <div className={`${styles.flowCard} ${styles.organized}`}>Coop memory</div>
          </div>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.featureGrid}>
          <Link to="/how-it-works" className={styles.featureCard}>
            <p className={styles.eyebrow}>Community</p>
            <h3>The Core Loop</h3>
            <p>See how capture, review, publishing, and archival fit together in one workflow.</p>
          </Link>

          <Link to="/sharing-knowledge" className={styles.featureCard}>
            <p className={styles.eyebrow}>Sharing</p>
            <h3>What Stays Local</h3>
            <p>Understand the publish boundary before anything enters shared coop memory.</p>
          </Link>

          <Link to="/builder/getting-started" className={styles.featureCard}>
            <p className={styles.eyebrow}>Builder</p>
            <h3>Install &amp; Build</h3>
            <p>
              Download the extension package, load it into Chrome, or jump into the repo to
              contribute.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
