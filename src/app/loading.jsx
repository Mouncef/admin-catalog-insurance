export default function RootLoading() {
    return (
        <div className="fixed inset-0 bg-base-200 bg-opacity-50 flex items-center justify-center z-50">
            {/* DaisyUI spinner; swap for your favorite */}
            <span className="loading loading-spinner loading-xl text-neutral"></span>
        </div>
    );
}