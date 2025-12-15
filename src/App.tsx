import { BrowserRouter, Routes, Route } from "react-router-dom"
import CredentialsPage from "./pages/credentials/page"
import Layout from "./Layout"
import BucketPage from "./pages/bucket/page"
import BucketsPage from './pages/buckets/page'
import ObjectPage from './pages/object/page'
import { Toaster } from 'sonner';

const Root = () => {
  return (
    <div>
      <div className="h-0 w-0">
        <Toaster />
      </div>
      <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<BucketsPage />}></Route>
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/bucket/:bucketName/*" element={<BucketPage />} />
          <Route path="/object/:bucketName/*" element={<ObjectPage />} />
        </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  )
}

const App = () => {
  return (
    <Root />
  )
}

export default App;