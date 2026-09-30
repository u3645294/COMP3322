const RECIPES = [
    {
        id: 'tomato-egg',
        name: 'Tomato Egg Scramble',
        photo: 'images/tomato-egg.jpg',
        ingredients: [
            { name: 'Tomato', amount: 3, unit: 'pcs' },
            { name: 'Egg',    amount: 2, unit: 'pcs' },
            { name: 'Salt',   amount: 5, unit: 'g'   }
        ],
        steps: [
            'Beat the eggs with a pinch of salt.',
            'Cut tomatoes into wedges.',
            'Scramble eggs in hot oil until just set; set aside.',
            'Stir-fry tomatoes until soft and juicy.',
            'Return eggs to pan, season, toss and serve.'
        ]
    },

    // Additional recipes will be added through backend database
];

window.RECIPES = RECIPES;