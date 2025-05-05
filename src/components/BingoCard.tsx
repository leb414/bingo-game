interface Props {
  numbers: number[][];
  called: number[];
}

export default function BingoCard({ numbers, called }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1 w-[260px] text-center border p-2 rounded">
      {['B', 'I', 'N', 'G', 'O'].map((h, i) => (
        <div key={i} className="font-bold">
          {h}
        </div>
      ))}
      {numbers.flat().map((num, i) => (
        <div
          key={i}
          className={`py-1 ${
            num === 0
              ? 'bg-green-300'
              : called.includes(num)
              ? 'bg-blue-300'
              : 'bg-white'
          } border rounded`}
        >
          {num === 0 ? '★' : num}
        </div>
      ))}
    </div>
  );
}
