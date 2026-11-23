export type QuestionCategory = {
    id: string;
    name: string;
    emoji: string;
    description: string;
    questions: string[];
};

export const QUESTION_CATEGORIES: QuestionCategory[] = [
    {
        id: "fun",
        name: "Fun",
        emoji: "😂",
        description: "Des questions légères pour mettre le groupe en mouvement.",
        questions: [
            "premiere impression que tu as eu de moi ?",
            "Qui est la personne la plus laide du groupe ?",
            "Qui arriverait en retard à son propre mariage ?",
            "Qui dépenserait un million d'euros seulement sur les femmes?",
            "Qui aime le plus les femmes ?",
            "Qui aime le plus les hommes ?",
            "Qui survivrait le mieux à une apocalypse ?",
            "Qui pourrait accidentellement devenir viral sur Internet ?",
            "Qui serait capable de dormir pendant une urgence ?",
            "Toi et moi dans une chambre 1h on fait quoi ?",
        ],
    },
    {
        id: "between-us",
        name: "Entre nous",
        emoji: "👀",
        description: "Des questions parfaites quand tout le groupe se connaît.",
        questions: [
            "Quelle est la première impression que vous aviez sur -(MembreDuGroupe)- ?",
            "Qui a le plus changé depuis que vous vous connaissez ?",
            "Vous pouvez tout balancer ce que vous avez sur le coeur ",
            "Quelle histoire du groupe ne vieillira jamais ?",
            "Que reprochez vous à quelqu'un dans le groupe?",
            "Quel membre du groupe serait le plus difficile à remplacer ?",
            "Quel voyage devrait absolument faire le groupe ensemble ?",
            "Qui est la personne la plus insupportable ?",
            "Qui pense cacher sa relation pourtant on est tous au courant",
            "Qui est selon vous les chances que -(MembreDuGroupe)- et -(MembreDuGroupe)- se mette ensemble ?",
        ],
    },
    {
        id: "hot",
        name: "Chaud",
        emoji: "🔥",
        description: "Les questions qu'il faut mieux laisser",
        questions: [
            "Quelle vérité personne ici n'oserait dire à voix haute ?",
            "Apoutchou ou Skinny ?",
            "Qui dans le groupe cache probablement le plus de choses ?",
            "Tu pourrais sortir avec l'ex d'un ami ?",
            "Quel comportement te fait perdre immédiatement tout intérêt pour quelqu'un ?",
            "La Position la plus difficile a maintenir lors des bails ?",
            "Devrait on recommencer avec les marriages arrangé ?",
            "Qui est le plus attirant du groupe ?",
            "La taille du robinet compte t'elle ?",
            "Peut-on vraiment aimer quelqu'un et quand même le tromper ?",
        ],
    },
    {
        id: "relationships",
        name: "Relations",
        emoji: "❤️",
        description: "Amour, crushs, ex et situations compliquées.",
        questions: [
            "Peut-on vraiment rester ami avec son ex ?",
            "Tu pourrais pardonner une infidélité ?",
            "L'amour suffit-il pour faire durer une relation ?",
            "Devoilez un couple qui crois trop se cacher",
            "Tu pourrais sortir avec quelqu'un que tes amis détestent ?",
            "Faut-il tout raconter à son partenaire ?",
            "Une relation à distance peut-elle vraiment fonctionner ?",
            "Quel est le plus gros red flag dans une relation ?",
            "Quel est ton fantasme le plus fou?",
            "Tu pourrais retourner avec quelqu'un qui t'a déjà brisé le cœur ?",
        ],
    },
    {
        id: "confessions",
        name: "Confessions",
        emoji: "🤫",
        description: "Pour faire sortir les histoires que personne ne raconte.",
        questions: [
            "Pourquoi es tu encore célibataire ?",
            "Quelle chose as-tu faite sans jamais l'avouer ?",
            "As-tu déjà fait semblant d'aimer quelqu'un ?",
            "Quelle décision regrettes-tu encore aujourd'hui ?",
            "As-tu déjà trahi la confiance d'un ami ?",
            "Quel message regrettes-tu le plus d'avoir envoyé ?",
            "Qui a quelques choses à dire et veux se lancer ?",
            "La plus grosse dinguerie que tu ais faite ?",
            "As-tu déjà ignoré volontairement quelqu'un que tu aimais ?",
            "Quelle vérité sur toi surprendrait le plus le groupe ?",
        ],
    },
    {
        id: "debates",
        name: "Débats",
        emoji: "🧠",
        description: "Des sujets palpitants et des opinions qui divisent.",
        questions: [
            "20000€/mois a condition de fom 2fois/jour ,tu acceptes?",
            "L'argent peut-il réellement rendre heureux ?",
            "Premier Date au mc Donald ,ca passe?",
            "un homme qui se bat et fort aux fess#s ou un homme riche mais faible aux fess#s ?",
            "Est-ce que tout le monde mérite une seconde chance ?",
            "Apoutchou ou Skinny ?",
            "Le Bodycount est il important ?",
            "Faire des bails avec un ami(e) ?",
            "Est-ce pire de mentir ou de cacher volontairement la vérité ?",
            "Tu choisirais l'amour ou ta carrière si tu devais absolument sacrifier l'un des deux ?",
        ],
    },

];
