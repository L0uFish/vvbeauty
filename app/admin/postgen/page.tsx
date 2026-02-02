import PostGenerator from "./PostGenerator";

export const metadata = {
  title: "Post Generator – VVBeauty Admin",
};

export default function PostgenPage() {
  return (
    <div className="postgen-wrapper">
      <h1 className="page-title">Instagram Post / Story Generator</h1>
      <PostGenerator />
    </div>
  );
}