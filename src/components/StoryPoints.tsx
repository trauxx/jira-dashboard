interface Props {
  points: number;
}

export default function StoryPoints({ points }: Props) {
  return (
    <span className="rounded bg-black/20 px-1.5 py-0.5 text-xs">
      {points}
    </span>
  );
}