#!/usr/bin/env python3
"""Collect 100 recipes through TheMealDB's permitted official API (stdlib only)."""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import string
import time
import urllib.request

API = "https://www.themealdb.com/api/json/v1/1/"
ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = ["Beef", "Chicken", "Pork", "Seafood", "Pasta", "Vegetarian", "Breakfast", "Side", "Dessert", "Miscellaneous"]
GROUPS = {
    "chicken": r"\bchicken\b",
    "beef": r"\bbeef\b",
    "pork": r"\b(pork|bacon|ham|prosciutto|pancetta|chorizo)\b",
    "seafood": r"\b(fish|salmon|tuna|cod|haddock|prawn|shrimp|mackerel|sardine|anchov|mussel|clam|squid|conch|crab|lobster|tilapia|trout|hake|pollock)\w*\b",
    "pasta": r"\b(pasta|spaghetti|penne|macaroni|linguine|linguini|fettuccine|tagliatelle|rigatoni|fusilli|lasagne|lasagna|pappardelle|ravioli|tortellini|vermicelli)\b",
    "rice": r"\brice\b",
    "potato": r"\bpotato\w*\b",
    "legumes": r"\b(bean|lentil|chickpea|tofu)\w*\b",
    "egg": r"\beggs?\b",
    "fruit": r"\b(apple|banana|strawberr|blueberr|raspberr|pear|peach|apricot|plum|cherr|pineapple|mango|raisin|sultana)\w*\b",
}
ALIASES = {
    "tomatoes": "tomato", "chopped tomatoes": "tomato", "onions": "onion",
    "carrots": "carrot", "potatoes": "potato", "eggs": "egg", "egg yolks": "egg yolk",
    "egg whites": "egg white", "mushrooms": "mushroom", "lemons": "lemon", "limes": "lime",
    "apples": "apple", "bananas": "banana", "strawberries": "strawberry",
    "chickpeas": "chickpea", "lentils": "lentil", "kidney beans": "kidney bean",
    "black beans": "black bean", "garlic clove": "garlic", "garlic cloves": "garlic",
    "spring onions": "green onion", "spring onion": "green onion", "scallions": "green onion",
    "aubergine": "eggplant", "aubergines": "eggplant", "yoghurt": "yogurt",
    "plain yogurt": "yogurt", "olive oil": "olive oil", "extra virgin olive oil": "olive oil",
    "plain flour": "flour", "all-purpose flour": "flour", "all purpose flour": "flour",
    "red pepper": "bell pepper", "green pepper": "bell pepper", "yellow pepper": "bell pepper",
    "red bell pepper": "bell pepper", "green bell pepper": "bell pepper",
    "coriander leaves": "coriander", "cilantro": "coriander", "black peppercorns": "black pepper",
    "egg plants": "eggplant", "egg plant": "eggplant", "natural yoghurt": "yogurt",
    "chicken breasts": "chicken breast", "free-range eggs, beaten": "egg", "eggs, beaten": "egg",
}
VEGETABLES = {"tomato", "onion", "garlic", "carrot", "potato", "bell pepper", "eggplant", "broccoli", "spinach", "cucumber", "green onion", "mushroom"}
FRUITS = {"apple", "banana", "lemon", "lime", "orange", "strawberry", "avocado"}
UNIT_ALIASES = {"tablespoon": "tbsp", "tablespoons": "tbsp", "tbs": "tbsp", "tsp.": "tsp", "teaspoon": "tsp", "teaspoons": "tsp", "cups": "cup", "grams": "g", "gram": "g", "kilograms": "kg", "litres": "l", "liter": "l", "millilitres": "ml", "ounces": "oz", "pounds": "lb", "lbs": "lb"}


def get_json(endpoint, cache):
    path = cache / (hashlib.sha256(endpoint.encode()).hexdigest() + ".json")
    if path.exists():
        return json.loads(path.read_text())
    for attempt in range(3):
        try:
            request = urllib.request.Request(API + endpoint, headers={"User-Agent": "PantryChef-development-recipe-collector/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                data = json.load(response)
            path.write_text(json.dumps(data, ensure_ascii=False))
            time.sleep(0.3)
            return data
        except (OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def ingredient_category(name):
    if name in VEGETABLES or re.search(r"onion|cabbage|lettuce|celery|courgette|zucchini|pepper|pumpkin|squash|leek|asparagus|beetroot", name):
        return "Vegetables"
    if name in FRUITS or re.search(GROUPS["fruit"], name):
        return "Fruit"
    if re.search(r"chicken|beef|pork|bacon|ham|lamb|duck|turkey|goat|sausage|chorizo|prosciutto|pancetta", name) or re.search(GROUPS["seafood"], name) or re.search(GROUPS["egg"], name):
        return "Protein"
    if re.search(r"milk|butter|cheese|cream|yogurt|parmesan|mozzarella|ricotta|feta|mascarpone|ghee", name) and not re.search(r"coconut|almond|peanut|cocoa|soy", name):
        return "Dairy"
    if re.search(GROUPS["legumes"], name):
        return "Legumes"
    if re.search(r"rice|pasta|bread|flour|oat|spaghetti|penne|macaroni|noodle|couscous|quinoa|lasagne|semolina|bulgur|puff pastry", name):
        return "Grains"
    if "oil" in name:
        return "Oil"
    if re.search(r"sauce|vinegar|honey|ketchup|mayonnaise|mustard|paste|stock|broth", name):
        return "Condiments"
    if re.search(r"salt|pepper|cumin|paprika|basil|coriander|cinnamon|turmeric|oregano|thyme|rosemary|spice|ginger|chilli|chili|sugar", name):
        return "Seasoning"
    return "Other"


def parse_measure(measure):
    text = measure.strip().lower()
    for symbol, fraction in {"½": "1/2", "¼": "1/4", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8"}.items():
        text = text.replace(symbol, " " + fraction)
    match = re.match(r"^(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*([a-z.]+)?$", text.strip())
    if not match:
        return None, None  # Preserve ranges, package sizes and prose in source_measure.
    number, unit = match.groups()
    try:
        if " " in number:
            whole, fraction = number.split()
            numerator, denominator = fraction.split("/")
            quantity = int(whole) + int(numerator) / int(denominator)
        elif "/" in number:
            numerator, denominator = number.split("/")
            quantity = int(numerator) / int(denominator)
        else:
            quantity = float(number)
    except ZeroDivisionError:
        return None, None
    return round(quantity, 2), UNIT_ALIASES.get(unit, unit) if unit else None


def ingredients_for(meal):
    result = {}
    for index in range(1, 21):
        source_name = (meal.get(f"strIngredient{index}") or "").strip()
        if not source_name:
            continue
        measure = (meal.get(f"strMeasure{index}") or "").strip()
        name = ALIASES.get(source_name.lower(), source_name.lower())
        quantity, unit = parse_measure(measure)
        item = {"canonical_name": name, "category": ingredient_category(name), "quantity": quantity, "unit": unit,
                "optional": bool(re.search(r"\boptional\b", measure, re.I)), "source_name": source_name, "source_measure": measure}
        if name in result:
            previous = result[name]
            if previous["quantity"] is not None and quantity is not None and previous["unit"] == unit:
                previous["quantity"] = round(previous["quantity"] + quantity, 2)
            else:
                previous["quantity"], previous["unit"] = None, None
            previous["source_name"] += " / " + source_name
            previous["source_measure"] += " / " + measure
            previous["optional"] = previous["optional"] and item["optional"]
        else:
            result[name] = item
    return list(result.values())


def group_matches(group, name):
    if not re.search(GROUPS[group], name.lower()):
        return False
    # Avoid counting rice vinegar, vanilla beans, potato starch or fish sauce as staples.
    excluded = r"stock|broth|sauce|oil|flour|vinegar|wine|starch|syrup|juice|jam|vanilla|cocoa|cacao|coffee"
    if group == "fruit":
        excluded += r"|tomato"
    if group == "egg":
        excluded += r"|plant"
    return not re.search(excluded, name.lower())


def select_balanced(meals):
    """Integral max flow enforces category AND ingredient quotas simultaneously."""
    graph = collections.defaultdict(list)
    def edge(a, b, capacity):
        forward = [b, capacity, len(graph[b])]
        backward = [a, 0, len(graph[a])]
        graph[a].append(forward)
        graph[b].append(backward)
        return forward
    for category in CATEGORIES:
        edge("start", "category:" + category, 10)
    for group in GROUPS:
        edge("group:" + group, "end", 10)
    links = []
    seen_titles = set()
    category_group = {"Beef": "beef", "Chicken": "chicken", "Pork": "pork", "Seafood": "seafood", "Pasta": "pasta"}
    for meal in sorted(meals, key=lambda m: hashlib.sha256(m["idMeal"].encode()).hexdigest()):
        if meal["strCategory"] not in CATEGORIES or not (meal.get("strInstructions") or "").strip():
            continue
        normalized_title = re.sub(r"[^a-z0-9]", "", meal["strMeal"].lower().replace("fettucine", "fettuccine"))
        if normalized_title in seen_titles:
            continue
        actual = [meal.get(f"strIngredient{i}") or "" for i in range(1, 21)]
        primary = category_group.get(meal["strCategory"])
        if primary and not any(group_matches(primary, n) for n in actual):
            continue  # Exclude plainly mislabeled source categories, such as lamb in Beef.
        seen_titles.add(normalized_title)
        node = "recipe:" + meal["idMeal"]
        for group, pattern in GROUPS.items():
            if primary and group != primary:
                continue
            matches = any(group_matches(group, n) for n in actual)
            if matches:
                link = edge(node, "group:" + group, 1)
                links.append((meal, group, link))
        edge("category:" + meal["strCategory"], node, 1)
    flow = 0
    while True:
        queue = collections.deque(["start"])
        parents = {"start": None}
        while queue and "end" not in parents:
            a = queue.popleft()
            for i, (b, capacity, _) in enumerate(graph[a]):
                if capacity and b not in parents:
                    parents[b] = (a, i)
                    queue.append(b)
        if "end" not in parents:
            break
        node = "end"
        while parents[node] is not None:
            a, index = parents[node]
            link = graph[a][index]
            link[1] -= 1
            graph[node][link[2]][1] += 1
            node = a
        flow += 1
    if flow != 100:
        raise ValueError(f"Only {flow}/100 recipes satisfy both quotas. Source category counts: {dict(collections.Counter(m['strCategory'] for m in meals))}")
    return sorted([(m, group) for m, group, link in links if link[1] == 0], key=lambda pair: (pair[0]["strCategory"], pair[0]["strMeal"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "data/recipes.csv")
    parser.add_argument("--cache", type=Path, default=Path("/tmp/pantrychef-recipe-cache"))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    meals = {}
    for letter in string.ascii_lowercase:
        for meal in get_json("search.php?f=" + letter, args.cache).get("meals") or []:
            meals[meal["idMeal"]] = meal
        print(f"Fetched {letter}: {len(meals)} unique recipes", flush=True)
    selected = select_balanced(list(meals.values()))
    rows = []
    fetched_at = dt.datetime.now(dt.timezone.utc).isoformat()
    for meal, group in selected:
        instructions = meal["strInstructions"].strip()
        steps = [part.strip() for part in re.split(r"\r?\n+", instructions) if part.strip()]
        steps = [re.sub(r"^(?:step\s*)?\d+[.)]?\s+", "", s, flags=re.I) for s in steps]
        steps = [s for s in steps if not re.fullmatch(r"(?:step\s*)?\d+[.)]?", s, re.I)]
        tags = list(dict.fromkeys([meal["strCategory"].lower(), (meal.get("strArea") or "Unknown").lower(), "ingredient:" + group] + [s.strip().lower() for s in (meal.get("strTags") or "").split(",") if s.strip()]))
        rows.append({
            "source_id": meal["idMeal"], "category": meal["strCategory"], "cuisine": meal.get("strArea") or "",
            "balance_ingredient": group, "title": meal["strMeal"],
            "description": f"{meal.get('strArea') or 'International'} {meal['strCategory'].lower()} recipe from TheMealDB.",
            "servings": "", "prep_minutes": "", "cook_minutes": "", "difficulty": "",
            "image_url": meal.get("strMealThumb") or "", "source_url": f"https://www.themealdb.com/meal/{meal['idMeal']}",
            "tags": json.dumps(tags, ensure_ascii=False), "ingredients": json.dumps(ingredients_for(meal), ensure_ascii=False),
            "steps": json.dumps([{"step_number": i + 1, "instruction": s} for i, s in enumerate(steps)], ensure_ascii=False),
            "publisher_source_url": meal.get("strSource") or "", "youtube_url": meal.get("strYoutube") or "",
            "fetched_at": fetched_at, "metadata_notes": "Source omits servings, prep/cook times and difficulty; blanks import as SQL NULL. Description generated from source category/cuisine. Ingredient categories and balance groups assigned locally.",
            "source_attribution": "TheMealDB (https://www.themealdb.com); API terms: https://www.themealdb.com/terms_of_use.php",
            "image_creative_commons": meal.get("strCreativeCommonsConfirmed") or "",
            "source_copyright": meal.get("strImageAttribution") or "",
        })
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    summary = {
        "count": len(rows), "category_counts": dict(collections.Counter(r["category"] for r in rows)),
        "balance_ingredient_counts": dict(collections.Counter(r["balance_ingredient"] for r in rows)),
        "cuisine_counts": dict(collections.Counter(r["cuisine"] for r in rows)),
        "ingredient_occurrences": dict(collections.Counter(i["canonical_name"] for r in rows for i in json.loads(r["ingredients"])).most_common()),
        "ingredient_rows": sum(len(json.loads(r["ingredients"])) for r in rows),
        "step_rows": sum(len(json.loads(r["steps"])) for r in rows),
        "fetched_at": fetched_at,
        "balance_definition": "Exactly 10 recipes per source category and exactly 10 per assigned common ingredient group. Each assigned group is present as a food ingredient. A recipe may contain several groups; seasonings are not equalized.",
    }
    args.output.with_name("recipes-summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: v for k, v in summary.items() if k != "ingredient_occurrences"}, indent=2))


if __name__ == "__main__":
    main()
