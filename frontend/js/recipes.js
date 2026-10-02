const RECIPES = [
    {
        id: 1,
        name: 'Tomato Egg Scramble',
        photo: '../assets/recipes/tomato-egg.jpg',
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
    {
        id: 2,
        name: 'Honey Soy Pork Rice',
        photo: '../assets/recipes/honey-soy-pork-rice.jpg',
        ingredients: [
            { name: 'Rice',        amount: 150, unit: 'g'  },
            { name: 'Pork',        amount: 200, unit: 'g'  },
            { name: 'Honey',       amount: 20,  unit: 'g'  },
            { name: 'Soy Sauce',   amount: 20,  unit: 'ml' },
            { name: 'Oil',         amount: 15,  unit: 'ml' }
        ],
        steps: [
            'Rinse the rice and cook with water until tender.',
            'Mix honey and soy sauce in a small bowl.',
            'Heat oil in a pan and sear pork until browned.',
            'Pour in the honey-soy sauce and cook until glossy.',
            'Serve the pork over the rice.'
        ]
    },
    {
        id: 3,
        name: 'Soy Bacon Pasta',
        photo: '../assets/recipes/soy-bacon-pasta.jpg',
        ingredients: [
            { name: 'Pasta',       amount: 200,  unit: 'g'  },
            { name: 'Salt',        amount: 10,   unit: 'g'  },
            { name: 'Bacon',       amount: 4,    unit: 'pcs' },
            { name: 'Soy Sauce',   amount: 20,   unit: 'ml' },
            { name: 'Oil',         amount: 10,   unit: 'ml' }
        ],
        steps: [
            'Boil water with salt, then cook pasta until al dente; drain.',
            'Heat oil in a pan and cook bacon until crisp.',
            'Add the drained pasta and soy sauce to the pan.',
            'Toss for 1 minute until evenly coated.',
            'Serve hot.'
        ]
    }
    // Additional recipes will be added through backend database
];

window.RECIPES = RECIPES;