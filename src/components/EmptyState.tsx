function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🖼️</div>
        <h2 className="text-xl text-gray-300 mb-2">No template loaded</h2>
        <p className="text-gray-500">
          Open an image or drag and drop to start creating memes
        </p>
      </div>
    </div>
  );
}

export default EmptyState;