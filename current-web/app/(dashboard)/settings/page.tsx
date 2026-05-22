export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">设置</h1>

      <div className="space-y-6">
        {/* API Keys */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">API 密钥配置</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">MiniMax API Key</label>
              <input
                type="password"
                placeholder="输入 MiniMax M2.7-highspeed API Key"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Tripo3D API Key</label>
              <input
                type="password"
                placeholder="输入 Tripo3D API Key"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </section>

        {/* Inference Service */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">推理服务</h2>
          <div>
            <label className="block text-xs text-muted mb-1">Python 微服务地址</label>
            <input
              type="text"
              placeholder="http://localhost:8000"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-panel-bg border border-panel-border rounded-lg p-5">
          <h2 className="text-sm font-medium mb-4">偏好设置</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">默认速度单位</span>
              <select className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md">
                <option>m/s</option>
                <option>km/h</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">默认距离单位</span>
              <select className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md">
                <option>米 (m)</option>
                <option>毫米 (mm)</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
