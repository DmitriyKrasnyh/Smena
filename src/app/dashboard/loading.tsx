export default function DashboardLoading() {
  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="mb-7">
        <div className="h-3 w-32 bg-[#e4ddd2] rounded mb-2" />
        <div className="h-7 w-56 bg-[#e4ddd2] rounded mb-2" />
        <div className="h-4 w-40 bg-[#ece8e1] rounded" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-[#e4ddd2] p-4">
            <div className="w-9 h-9 rounded-[10px] bg-[#f0ece4] mb-3" />
            <div className="h-8 w-8 bg-[#e4ddd2] rounded mb-1" />
            <div className="h-3 w-16 bg-[#ece8e1] rounded" />
          </div>
        ))}
      </div>

      {/* Two-col skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-[14px] border border-[#e4ddd2] h-16" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-[14px] border border-[#e4ddd2] h-44" />
          <div className="bg-white rounded-[14px] border border-[#e4ddd2] h-32" />
        </div>
      </div>
    </div>
  )
}
