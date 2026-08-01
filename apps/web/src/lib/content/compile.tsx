import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { createLessonComponents } from "./mdx-components";

/**
 * Compile le corps MDX d'une leçon (hors frontmatter, déjà séparé par
 * `parseFrontmatter`) en React Server Component.
 *
 * `next-mdx-remote/rsc` compile à la requête, sans étape de build séparée :
 * cohérent avec ADR-0010 (le contenu vit en Git, pas en base) et avec le
 * budget de performance de la leçon (docs/05 M2 — < 100 kB JS, LCP < 1,5 s
 * sur 4G simulé), puisqu'aucun bundle JS supplémentaire n'est nécessaire pour
 * le rendu des blocs eux-mêmes : seul `next-mdx-remote` recompile côté
 * serveur, le HTML produit est statique.
 */
export function LessonContent({
  content,
  videoUrl,
}: {
  content: string;
  videoUrl: string | null;
}) {
  return (
    <MDXRemote
      source={content}
      components={createLessonComponents(videoUrl)}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      }}
    />
  );
}
