type Props = {
  displayName: string | null;
};

/** Khối chữ lời mời phía trên ảnh chân dung trên hero thiệp. */
export function HeroInviteCopy({ displayName }: Props) {
  return (
    <div className="invite-hero-letter">
      <div className="invite-hero-ornament" aria-hidden>
        <span className="invite-hero-ornament-line" />
        <span className="invite-hero-ornament-gem">✦</span>
        <span className="invite-hero-ornament-line" />
      </div>

      <p className="invite-hero-eyebrow">Trân trọng kính mời</p>

      {displayName ? (
        <p className="invite-hero-guest" aria-label={`Khách mời ${displayName}`}>
          {displayName}
        </p>
      ) : null}

      <p className="invite-hero-bridge">đến dự buổi lễ tốt nghiệp của</p>

      <div className="invite-hero-ornament invite-hero-ornament--tail" aria-hidden>
        <span className="invite-hero-ornament-line invite-hero-ornament-line--short" />
      </div>
    </div>
  );
}
