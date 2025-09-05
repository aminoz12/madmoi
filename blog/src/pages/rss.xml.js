import rss from '@astrojs/rss';

export async function GET(context) {
  // Mock data for RSS feed - in production, this would come from your CMS or markdown files
  const posts = [
    {
      title: 'Découverte du BDSM : Guide Complet pour Débutants',
      description: 'Plongez dans l\'univers fascinant du BDSM. Découvrez les bases, la sécurité, et comment explorer vos désirs en toute confiance.',
      link: 'https://mad2moi-blog.com/blog/decouverte-bdsm-debutants',
      pubDate: new Date('2025-01-15'),
      author: 'Dr. Sensuel',
      category: 'BDSM'
    },
    {
      title: 'L\'Art du Libertinage Moderne : Éthique et Plaisir',
      description: 'Redécouvrez le libertinage comme un art de vivre. Éthique, consentement et exploration des plaisirs partagés.',
      link: 'https://mad2moi-blog.com/blog/art-libertinage-moderne',
      pubDate: new Date('2025-01-12'),
      author: 'Libertine Experte',
      category: 'Libertinage'
    },
    {
      title: 'Scénarios de Roleplay Avancés : Créer l\'Intensité',
      description: 'Maîtrisez l\'art du roleplay avec des scénarios sophistiqués qui stimulent l\'imagination et intensifient l\'expérience.',
      link: 'https://mad2moi-blog.com/blog/roleplay-scenarios-avances',
      pubDate: new Date('2025-01-10'),
      author: 'Maître de l\'Imagination',
      category: 'Roleplay'
    },
    {
      title: 'Communication Sexuelle : Le Secret d\'une Vie Érotique Épanouie',
      description: 'Apprenez à communiquer vos désirs, limites et fantasmes pour une intimité plus profonde et satisfaisante.',
      link: 'https://mad2moi-blog.com/blog/communication-sexe-couple',
      pubDate: new Date('2025-01-08'),
      author: 'Dr. Sensuel',
      category: 'Communication'
    },
    {
      title: 'Sex Toys : Guide Complet du Choix à l\'Utilisation',
      description: 'Découvrez l\'univers des sex toys : comment choisir, utiliser et intégrer ces accessoires dans votre vie intime.',
      link: 'https://mad2moi-blog.com/blog/toys-sexe-choix-utilisation',
      pubDate: new Date('2025-01-05'),
      author: 'Libertine Experte',
      category: 'Sex Toys'
    },
    {
      title: 'Fantasmes et Tabous : L\'Art de l\'Exploration Consciente',
      description: 'Osez explorer vos fantasmes les plus profonds dans un cadre sécurisé et bienveillant.',
      link: 'https://mad2moi-blog.com/blog/fantasmes-tabous-exploration',
      pubDate: new Date('2025-01-03'),
      author: 'Maître de l\'Imagination',
      category: 'Fantasmes'
    }
  ];

  return rss({
    title: 'Mad2Moi Blog - Exploration Érotique & Bien-être',
    description: 'Blog mature et sophistiqué sur l\'exploration érotique et le bien-être sexuel. Contenu éducatif et bienveillant pour adultes consentants.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      link: post.link,
      pubDate: post.pubDate,
      author: post.author,
      category: post.category,
      // Add custom fields for better RSS readers
      customData: `
        <author>${post.author}</author>
        <category>${post.category}</category>
        <guid>${post.link}</guid>
      `
    })),
    customData: `
      <language>fr</language>
      <copyright>© 2025 Mad2Moi. Tous droits réservés.</copyright>
      <managingEditor>contact@mad2moi-blog.com</managingEditor>
      <webMaster>contact@mad2moi-blog.com</webMaster>
      <ttl>60</ttl>
      <image>
        <url>https://mad2moi-blog.com/logo.avif</url>
        <title>Mad2Moi Blog</title>
        <link>https://mad2moi-blog.com</link>
        <width>144</width>
        <height>144</height>
        <description>Logo Mad2Moi Blog</description>
      </image>
    `
  });
}
