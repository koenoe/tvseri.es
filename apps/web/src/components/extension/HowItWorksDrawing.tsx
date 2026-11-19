import { useId } from 'react';
import BbcIplayerLogo from '@/components/brand/logos/BbcIplayerLogo';
import NetflixLogo from '@/components/brand/logos/NetflixLogo';
import PrimeVideoLogo from '@/components/brand/logos/PrimeVideoLogo';

import cn from '@/lib/cn';

import styles from './drawing.module.css';

/** The drawing's name for assistive tech */
const LABEL =
  'How a sign-in moves: your browser and the tvseri.es extension send it once over HTTPS with a one-time code to the tvseri.es API Lambda, which test-reads it and encrypts it with a KMS data key (envelope encryption, encryption context user id and service), storing AES-256-GCM ciphertext and the wrapped key in DynamoDB in eu-west-2. Only the nightly sync Lambda has kms:Decrypt; it reads your watch history on the service and marks episodes watched in your tvseri.es history.';

/**
 * Drawn twice, not scaled: across on a computer, top to bottom in a phone's
 * sheet. Marker ids come from useId, so it may render more than once a page.
 */
export default function HowItWorksDrawing() {
  // A prefix safe in `url(#…)`: React's ids may carry characters it isn't
  const ids = useId().replace(/[^\w-]/g, '');
  return (
    <>
      <svg
        aria-label={LABEL}
        className={cn('block h-auto w-full max-sm:hidden', styles.build)}
        role="img"
        viewBox="0 0 1020 420"
      >
        <defs>
          <marker
            id={`${ids}pdm0`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s1)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}pdm1`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s2)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}pdm2`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s3)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}pdm3`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s4)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}pdm4`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s4)}
              d="M0 0L10 5L0 10z"
              fill="#00ffff"
            />
          </marker>
          <marker
            id={`${ids}pdm5`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s5)}
              d="M0 0L10 5L0 10z"
              fill="#00ffff"
            />
          </marker>
          <marker
            id={`${ids}pdm6`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s6)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}pdm7`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s6)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
        </defs>
        <rect
          fill="rgba(255,255,255,.025)"
          height="404"
          rx="16"
          stroke="rgba(255,255,255,.16)"
          strokeDasharray="5 5"
          width="152"
          x="8"
          y="8"
        />
        <text
          fill="rgba(255,255,255,.62)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing=".08em"
          x="22"
          y="30"
        >
          YOUR BROWSER
        </text>
        <rect
          fill="rgba(255,255,255,.025)"
          height="404"
          rx="16"
          stroke="rgba(255,255,255,.16)"
          strokeDasharray="5 5"
          width="630"
          x="180"
          y="8"
        />
        <text
          fill="rgba(255,255,255,.62)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing=".08em"
          x="194"
          y="30"
        >
          TVSERI.ES · AWS
        </text>
        <text fill="rgba(255,255,255,.4)" fontSize="10.5" x="194" y="45">
          eu-west-2 (London)
        </text>
        <rect
          fill="rgba(255,255,255,.025)"
          height="404"
          rx="16"
          stroke="rgba(255,255,255,.16)"
          strokeDasharray="5 5"
          width="182"
          x="830"
          y="8"
        />
        <text
          fill="rgba(255,255,255,.62)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing=".08em"
          x="844"
          y="30"
        >
          THE SERVICE
        </text>
        <path
          className={cn(styles.line, styles.s1)}
          d="M146 190 L242 190"
          fill="none"
          markerEnd={`url(#${ids}pdm0)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s2)}
          d="M390 172 L450 96"
          fill="none"
          markerEnd={`url(#${ids}pdm1)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s3)}
          d="M390 208 L450 208"
          fill="none"
          markerEnd={`url(#${ids}pdm2)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s4)}
          d="M622 214 L714 214 L714 314"
          fill="none"
          markerEnd={`url(#${ids}pdm3)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s4)}
          d="M770 314 L770 74 L624 74"
          fill="none"
          markerEnd={`url(#${ids}pdm4)`}
          pathLength={1}
          stroke="#00ffff"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s5)}
          d="M792 340 L882 340"
          fill="none"
          markerEnd={`url(#${ids}pdm5)`}
          pathLength={1}
          stroke="#00ffff"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s6)}
          d="M884 368 L794 368"
          fill="none"
          markerEnd={`url(#${ids}pdm6)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s6)}
          d="M636 350 L392 350"
          fill="none"
          markerEnd={`url(#${ids}pdm7)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <g className={cn(styles.node, styles.s0)}>
          <rect
            fill="#222a2b"
            height="74"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="130"
            x="16"
            y="156"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(30 169) scale(0.5833)"
          >
            <rect height="11" rx="2" width="16" x="4" y="5" />
            <path d="M2 19h20" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="50" y="181">
            Your browser
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="30" y="199">
            + extension
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="30" y="215">
            once, on Connect
          </text>
        </g>
        <g className={cn(styles.node, styles.s1)}>
          <rect
            fill="#222a2b"
            height="74"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="146"
            x="244"
            y="156"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(258 169) scale(0.5833)"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="278" y="181">
            tvseri.es API
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="258" y="199">
            Lambda · test read
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="258" y="215">
            kms:GenerateDataKey
          </text>
        </g>
        <g className={cn(styles.node, styles.s2)}>
          <rect
            fill="#222a2b"
            height="74"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="170"
            x="452"
            y="40"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(466 53) scale(0.5833)"
          >
            <circle cx="8" cy="15" r="4" />
            <path d="M10.8 12.2 20 3M17 6l3 3M14 9l2 2" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="486" y="65">
            AWS KMS
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="466" y="83">
            envelope encryption
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="466" y="99">
            context: userId, service
          </text>
        </g>
        <g className={cn(styles.node, styles.s3)}>
          <rect
            fill="#222a2b"
            height="90"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="170"
            x="452"
            y="172"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(466 185) scale(0.5833)"
          >
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="486" y="197">
            DynamoDB
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="466" y="215">
            SSE at rest
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="466" y="231">
            AES-256-GCM ciphertext
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="466" y="247">
            + wrapped data key
          </text>
        </g>
        <g className={cn(styles.node, styles.s4)}>
          <rect
            fill="rgba(0,255,255,.07)"
            height="74"
            rx="12"
            stroke="#00ffff"
            strokeWidth="1.5"
            width="156"
            x="636"
            y="316"
          />
          <g
            fill="none"
            stroke="#00ffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(650 329) scale(0.5833)"
          >
            <rect height="10" rx="2" width="14" x="5" y="11" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="670" y="341">
            Nightly sync job
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="650" y="359">
            Lambda
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="650" y="375">
            IAM: only kms:Decrypt
          </text>
        </g>
        <g className={cn(styles.node, styles.s6)}>
          <rect
            fill="#222a2b"
            height="74"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="146"
            x="244"
            y="316"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(258 329) scale(0.5833)"
          >
            <rect height="13" rx="3" width="19" x="2.5" y="8" />
            <path d="M7.5 3.5l4 4 5-5" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="278" y="341">
            Your history
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="258" y="359">
            on tvseri.es
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="258" y="375">
            tagged by service
          </text>
        </g>
        <g className={cn(styles.node, styles.s5)}>
          <rect
            fill="#222a2b"
            height="88"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="116"
            x="884"
            y="306"
          />
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="898" y="331">
            Watch history
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="898" y="349">
            on the service
          </text>
          <svg height="18" width="18" x="898" y="360.0">
            <NetflixLogo className="text-netflix" />
          </svg>
          <svg height="18" width="18" x="926.0" y="360.0">
            <BbcIplayerLogo className="text-iplayer" />
          </svg>
          <svg height="8.0" width="23.4" x="954.0" y="365.0">
            <PrimeVideoLogo className="text-prime" />
          </svg>
        </g>
        <g className={cn(styles.fade, styles.s1)}>
          <rect
            fill="#15191a"
            height="36"
            rx="10"
            width="87.4"
            x="151.3"
            y="172.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="195"
            y="186.0"
          >
            HTTPS (TLS)
          </text>
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="195"
            y="202.0"
          >
            one-time code
          </text>
        </g>
        <g className={cn(styles.fade, styles.s2)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="99.0"
            x="369.5"
            y="124.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="419"
            y="138.0"
          >
            GenerateDataKey
          </text>
        </g>
        <g className={cn(styles.fade, styles.s3)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="52.6"
            x="392.7"
            y="198.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="419"
            y="212.0"
          >
            PutItem
          </text>
        </g>
        <g className={cn(styles.fade, styles.s4)}>
          <rect
            fill="#15191a"
            height="36"
            rx="10"
            width="64.2"
            x="681.9"
            y="250.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="714"
            y="264.0"
          >
            nightly
          </text>
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="714"
            y="280.0"
          >
            04:00 UTC
          </text>
        </g>
        <g className={cn(styles.fade, styles.s4)}>
          <rect
            fill="#15191a"
            height="36"
            rx="10"
            width="81.6"
            x="729.2"
            y="152.0"
          />
          <text
            fill="#00ffff"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="770"
            y="166.0"
          >
            kms:Decrypt
          </text>
          <text
            fill="#00ffff"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="770"
            y="182.0"
          >
            same context
          </text>
        </g>
        <g className={cn(styles.fade, styles.s5)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="41.0"
            x="816.5"
            y="330.0"
          />
          <text
            fill="#00ffff"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="837"
            y="344.0"
          >
            reads
          </text>
        </g>
        <g className={cn(styles.fade, styles.s6)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="58.4"
            x="809.8"
            y="358.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="839"
            y="372.0"
          >
            episodes
          </text>
        </g>
        <g className={cn(styles.fade, styles.s6)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="139.6"
            x="443.2"
            y="340.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="513"
            y="354.0"
          >
            marks episodes watched
          </text>
        </g>
      </svg>
      <svg
        aria-label={LABEL}
        className={cn(
          'block h-auto w-full sm:hidden',
          styles.build,
          styles.phone,
        )}
        role="img"
        viewBox="0 0 358 900"
      >
        <defs>
          <marker
            id={`${ids}ppm0`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s1)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}ppm1`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s3)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}ppm2`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s2)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}ppm3`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s4)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}ppm4`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s4)}
              d="M0 0L10 5L0 10z"
              fill="#00ffff"
            />
          </marker>
          <marker
            id={`${ids}ppm5`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s6)}
              d="M0 0L10 5L0 10z"
              fill="rgba(255,255,255,.62)"
            />
          </marker>
          <marker
            id={`${ids}ppm6`}
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="9"
            refY="5"
            viewBox="0 0 10 10"
          >
            <path
              className={cn(styles.fade, styles.s5)}
              d="M0 0L10 5L0 10z"
              fill="#00ffff"
            />
          </marker>
        </defs>
        <rect
          fill="rgba(255,255,255,.025)"
          height="114"
          rx="16"
          stroke="rgba(255,255,255,.16)"
          strokeDasharray="5 5"
          width="350"
          x="4"
          y="4"
        />
        <text
          fill="rgba(255,255,255,.62)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing=".08em"
          x="18"
          y="26"
        >
          YOUR BROWSER
        </text>
        <rect
          fill="rgba(255,255,255,.025)"
          height="556"
          rx="16"
          stroke="rgba(255,255,255,.16)"
          strokeDasharray="5 5"
          width="350"
          x="4"
          y="150"
        />
        <text
          fill="rgba(255,255,255,.62)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing=".08em"
          x="18"
          y="172"
        >
          TVSERI.ES · AWS
        </text>
        <text fill="rgba(255,255,255,.4)" fontSize="10.5" x="18" y="187">
          eu-west-2 (London)
        </text>
        <rect
          fill="rgba(255,255,255,.025)"
          height="158"
          rx="16"
          stroke="rgba(255,255,255,.16)"
          strokeDasharray="5 5"
          width="350"
          x="4"
          y="738"
        />
        <text
          fill="rgba(255,255,255,.62)"
          fontSize="10.5"
          fontWeight="600"
          letterSpacing=".08em"
          x="18"
          y="760"
        >
          THE SERVICE
        </text>
        <path
          className={cn(styles.line, styles.s1)}
          d="M179 96 L179 188"
          fill="none"
          markerEnd={`url(#${ids}ppm0)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s3)}
          d="M140 266 L100 302"
          fill="none"
          markerEnd={`url(#${ids}ppm1)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s2)}
          d="M220 266 L262 302"
          fill="none"
          markerEnd={`url(#${ids}ppm2)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s4)}
          d="M60 404 L60 508 L94 508"
          fill="none"
          markerEnd={`url(#${ids}ppm3)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s4)}
          d="M264 508 L300 508 L300 396"
          fill="none"
          markerEnd={`url(#${ids}ppm4)`}
          pathLength={1}
          stroke="#00ffff"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s6)}
          d="M120 550 L120 616"
          fill="none"
          markerEnd={`url(#${ids}ppm5)`}
          pathLength={1}
          stroke="rgba(255,255,255,.62)"
          strokeWidth="1.5"
        />
        <path
          className={cn(styles.line, styles.s5)}
          d="M240 550 L240 774"
          fill="none"
          markerEnd={`url(#${ids}ppm6)`}
          pathLength={1}
          stroke="#00ffff"
          strokeWidth="1.5"
        />
        <g className={cn(styles.node, styles.s0)}>
          <rect
            fill="#222a2b"
            height="58"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="166"
            x="96"
            y="36"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(110 49) scale(0.5833)"
          >
            <rect height="11" rx="2" width="16" x="4" y="5" />
            <path d="M2 19h20" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="130" y="61">
            Your browser
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="110" y="79">
            + extension, once
          </text>
        </g>
        <g className={cn(styles.node, styles.s1)}>
          <rect
            fill="#222a2b"
            height="74"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="166"
            x="96"
            y="190"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(110 203) scale(0.5833)"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="130" y="215">
            tvseri.es API
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="110" y="233">
            Lambda · test read
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="110" y="249">
            kms:GenerateDataKey
          </text>
        </g>
        <g className={cn(styles.node, styles.s2)}>
          <rect
            fill="#222a2b"
            height="90"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="165"
            x="183"
            y="304"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(197 317) scale(0.5833)"
          >
            <circle cx="8" cy="15" r="4" />
            <path d="M10.8 12.2 20 3M17 6l3 3M14 9l2 2" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="217" y="329">
            AWS KMS
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="197" y="347">
            envelope encryption
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="197" y="363">
            encryption context:
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="197" y="379">
            userId + service
          </text>
        </g>
        <g className={cn(styles.node, styles.s3)}>
          <rect
            fill="#222a2b"
            height="90"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="165"
            x="10"
            y="304"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(24 317) scale(0.5833)"
          >
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="44" y="329">
            DynamoDB
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="24" y="347">
            SSE at rest
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="24" y="363">
            AES-256-GCM
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="24" y="379">
            + wrapped data key
          </text>
        </g>
        <g className={cn(styles.node, styles.s4)}>
          <rect
            fill="rgba(0,255,255,.07)"
            height="74"
            rx="12"
            stroke="#00ffff"
            strokeWidth="1.5"
            width="166"
            x="96"
            y="474"
          />
          <g
            fill="none"
            stroke="#00ffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(110 487) scale(0.5833)"
          >
            <rect height="10" rx="2" width="14" x="5" y="11" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="130" y="499">
            Nightly sync job
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="110" y="517">
            Lambda
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="110" y="533">
            IAM: only kms:Decrypt
          </text>
        </g>
        <g className={cn(styles.node, styles.s6)}>
          <rect
            fill="#222a2b"
            height="58"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="165"
            x="10"
            y="618"
          />
          <g
            fill="none"
            stroke="rgba(255,255,255,.8)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            transform="translate(24 631) scale(0.5833)"
          >
            <rect height="13" rx="3" width="19" x="2.5" y="8" />
            <path d="M7.5 3.5l4 4 5-5" />
          </g>
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="44" y="643">
            Your history
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="24" y="661">
            on tvseri.es
          </text>
        </g>
        <g className={cn(styles.node, styles.s5)}>
          <rect
            fill="#222a2b"
            height="88"
            rx="12"
            stroke="rgba(255,255,255,.2)"
            strokeWidth="1"
            width="165"
            x="183"
            y="776"
          />
          <text fill="#fff" fontSize="12.5" fontWeight="600" x="197" y="801">
            Watch history
          </text>
          <text fill="rgba(255,255,255,.62)" fontSize="11" x="197" y="819">
            on the service
          </text>
          <svg height="18" width="18" x="197" y="830.0">
            <NetflixLogo className="text-netflix" />
          </svg>
          <svg height="18" width="18" x="225.0" y="830.0">
            <BbcIplayerLogo className="text-iplayer" />
          </svg>
          <svg height="8.0" width="23.4" x="253.0" y="835.0">
            <PrimeVideoLogo className="text-prime" />
          </svg>
        </g>
        <g className={cn(styles.fade, styles.s1)}>
          <rect
            fill="#15191a"
            height="36"
            rx="10"
            width="87.4"
            x="135.3"
            y="116.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="179"
            y="130.0"
          >
            HTTPS (TLS)
          </text>
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="179"
            y="146.0"
          >
            one-time code
          </text>
        </g>
        <g className={cn(styles.fade, styles.s3)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="52.6"
            x="93.7"
            y="270.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="120"
            y="284.0"
          >
            PutItem
          </text>
        </g>
        <g className={cn(styles.fade, styles.s2)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="99.0"
            x="198.5"
            y="270.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="248"
            y="284.0"
          >
            GenerateDataKey
          </text>
        </g>
        <g className={cn(styles.fade, styles.s4)}>
          <rect
            fill="#15191a"
            height="36"
            rx="10"
            width="64.2"
            x="27.9"
            y="432.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="60"
            y="446.0"
          >
            nightly
          </text>
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="60"
            y="462.0"
          >
            04:00 UTC
          </text>
        </g>
        <g className={cn(styles.fade, styles.s4)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="75.8"
            x="262.1"
            y="444.0"
          />
          <text
            fill="#00ffff"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="300"
            y="458.0"
          >
            kms:Decrypt
          </text>
        </g>
        <g className={cn(styles.fade, styles.s6)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="87.4"
            x="76.3"
            y="570.0"
          />
          <text
            fill="rgba(255,255,255,.8)"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="120"
            y="584.0"
          >
            marks watched
          </text>
        </g>
        <g className={cn(styles.fade, styles.s5)}>
          <rect
            fill="#15191a"
            height="20"
            rx="10"
            width="87.4"
            x="196.3"
            y="712.0"
          />
          <text
            fill="#00ffff"
            fontSize="11"
            fontWeight="500"
            textAnchor="middle"
            x="240"
            y="726.0"
          >
            reads history
          </text>
        </g>
      </svg>
    </>
  );
}
