export default function TasksLoading() {
  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-24 bg-[#e4ddd2] rounded mb-2" />
          <div className="h-4 w-16 bg-[#ece8e1] rounded" />
        </div>
        <div className="h-10 w-24 bg-[#e4ddd2] rounded-[10px]" />
      </div>

      <div className="flex gap-2 mb-4">
        <div className="h-8 w-20 bg-[#e4ddd2] rounded-xl" />
        <div className="h-8 w-28 bg-[#ece8e1] rounded-xl" />
      </div>

      <div className="flex gap-2 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-[#ece8e1] rounded-[8px]" />
        ))}
      </div>

      <div className="space-y-2.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-[#e4ddd2] h-[72px]" />
        ))}
      </div>
    </div>
  )
}
