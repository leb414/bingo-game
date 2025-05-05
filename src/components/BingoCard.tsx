interface Props {
  numbers: number[][];
  called: number[];
}

export default function BingoCard({ numbers, called }: Props) {
  const flattened = numbers.flat();

  const totalCells = flattened.length;
  const matched = flattened.filter(
    (num, i) => num === 0 || called.includes(num)
  ).length;

  const progress = Math.round((matched / totalCells) * 100);

  return (
    <div className="relative grid grid-cols-5 gap-1 w-[260px] text-center border p-2 rounded bg-white shadow">
      {['B', 'I', 'N', 'G', 'O'].map((h, i) => (
        <div key={i} className="font-bold">
          {h}
        </div>
      ))}

      {flattened.map((num, i) => {
        const isCenter = i === 12;
        const isMarked = num === 0 || called.includes(num);

        return (
          <div
            key={i}
            className={`py-1 text-sm border rounded font-medium ${
              isCenter
                ? 'bg-green-300 relative'
                : isMarked
                ? 'bg-blue-300'
                : 'bg-white'
            }`}
          >
            {isCenter ? (
              <span className="text-xs font-semibold">{progress}%</span>
            ) : (
              num
            )}
          </div>
        );
      })}
    </div>
  );
}
