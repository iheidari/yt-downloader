import { Link } from 'react-router-dom'

// The "← Back" link shown at the top of the info/play/format screens.
function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1 text-secondary hover:text-primary font-label-md text-label-md mb-stack-md transition-colors"
    >
      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
      Back
    </Link>
  )
}

export default BackLink
