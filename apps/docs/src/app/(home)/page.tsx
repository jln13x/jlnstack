import { createRelativeLink } from "fumadocs-ui/mdx";
import { source } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";

export default async function HomePage() {
  const allPages = source.getPages();
  const indexPage = allPages.find((page) => page.slugs.length === 0);

  if (!indexPage) {
    return null;
  }

  const MDX = indexPage.data.body;

  return (
    <div className="flex-1 prose prose-neutral dark:prose-invert  grid place-items-center">
      <div className="mx-auto max-w-(--fd-layout-width) w-full">
        <h1 className="text-center">jlnstack</h1>
        <div>
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, indexPage),
            })}
          />
        </div>
      </div>
    </div>
  );
}
