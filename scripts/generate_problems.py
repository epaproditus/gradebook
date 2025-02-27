import sympy as sp
import random
import json
from typing import Dict, List, Any

"""
Simple proof of concept showing how SymPy can generate algebra problems
for the Tutoring Center based on specific TEKS standards.
"""

class ProblemGenerator:
    def __init__(self):
        # Map TEKS standards to generator functions
        self.generators = {
            'A.2A': self.generate_linear_equation,  # Linear equations
            'A.3B': self.generate_expression_simplification,  # Expression simplification
            '8.8A': self.generate_linear_function_from_points,  # Writing linear functions
            # Add more mappings as needed
        }
    
    def generate_for_standard(self, teks_standard: str, count: int = 5, difficulty: int = 2) -> List[Dict]:
        """Generate problems for a specific TEKS standard"""
        if teks_standard not in self.generators:
            raise ValueError(f"No generator available for {teks_standard}")
        
        generator_func = self.generators[teks_standard]
        problems = []
        
        for i in range(count):
            problem = generator_func(difficulty)
            problem['teks_standard'] = teks_standard
            problem['id'] = f"{teks_standard}_{i+1}"
            problems.append(problem)
            
        return problems
    
    def generate_linear_equation(self, difficulty: int = 2) -> Dict[str, Any]:
        """Generate a problem solving a linear equation (TEKS A.2A)"""
        # Create a symbolic variable
        x = sp.Symbol('x')
        
        # Generate coefficients based on difficulty
        if difficulty == 1:
            # Simple equation like 2x + 3 = 7
            a = random.randint(2, 5)
            b = random.randint(1, 10)
            c = random.randint(b+1, b+10)
            equation = sp.Eq(a*x + b, c)
            solution = sp.solve(equation, x)[0]
            
            problem_text = f"Solve for x: {sp.latex(a*x + b)} = {c}"
            solution_steps = f"Subtract {b} from both sides: {sp.latex(a*x)} = {c-b}\n"
            solution_steps += f"Divide both sides by {a}: {sp.latex(x)} = {sp.latex(solution)}"
            
        elif difficulty == 2:
            # Moderate equation like 2(x + 3) = 14
            a = random.randint(2, 5)
            b = random.randint(1, 5)
            c = random.randint(5, 15)
            equation = sp.Eq(a*(x + b), c)
            solution = sp.solve(equation, x)[0]
            
            problem_text = f"Solve for x: {sp.latex(a)}({sp.latex(x + b)}) = {c}"
            solution_steps = f"Distribute {a}: {sp.latex(a*x + a*b)} = {c}\n"
            solution_steps += f"Subtract {a*b} from both sides: {sp.latex(a*x)} = {c - a*b}\n"
            solution_steps += f"Divide both sides by {a}: {sp.latex(x)} = {sp.latex(solution)}"
            
        else:  # difficulty >= 3
            # Complex equation like 3(2x - 1) = 2(x + 4)
            a = random.randint(2, 5)
            b = random.randint(1, 5)
            c = random.randint(1, 3)
            d = random.randint(2, 7)
            equation = sp.Eq(a*(c*x - b), c*(x + d))
            solution = sp.solve(equation, x)[0]
            
            problem_text = f"Solve for x: {sp.latex(a)}({sp.latex(c*x - b)}) = {sp.latex(c)}({sp.latex(x + d)})"
            solution_steps = f"Distribute on the left: {sp.latex(a*c*x - a*b)} = {sp.latex(c*x + c*d)}\n"
            solution_steps += f"Distribute on the right: {sp.latex(a*c*x - a*b)} = {sp.latex(c*x + c*d)}\n"
            solution_steps += f"Subtract {c*x} from both sides: {sp.latex(a*c*x - c*x - a*b)} = {sp.latex(c*d)}\n"
            solution_steps += f"Factoring left side: {sp.latex((a*c - c)*x - a*b)} = {sp.latex(c*d)}\n"
            solution_steps += f"Simplify left side: {sp.latex(c*(a-1)*x - a*b)} = {sp.latex(c*d)}\n"
            solution_steps += f"Add {a*b} to both sides: {sp.latex(c*(a-1)*x)} = {sp.latex(c*d + a*b)}\n"
            solution_steps += f"Divide by {c*(a-1)}: x = {sp.latex(solution)}"
        
        # Generate answer choices for multiple choice format
        # Correct answer
        correct_answer = str(solution)
        
        # Generate distractors by applying common errors
        distractors = []
        # Wrong sign
        distractors.append(str(-solution))
        # Off by 1 or 2
        distractors.append(str(solution + 1))
        distractors.append(str(solution - 1))
        
        # Filter out any duplicates
        distractors = [d for d in distractors if d != correct_answer]
        # Add a random distractor if needed
        while len(distractors) < 3:
            random_distractor = str(solution + random.randint(-5, 5))
            if random_distractor != correct_answer and random_distractor not in distractors:
                distractors.append(random_distractor)
        
        # Take only 3 distractors
        distractors = distractors[:3]
        
        # Combine correct + distractors and shuffle
        all_options = [correct_answer] + distractors
        random.shuffle(all_options)
        
        return {
            'problem_text': problem_text,
            'difficulty': difficulty,
            'answers': {
                'correct': correct_answer,
                'options': all_options
            },
            'solution': solution_steps,
            'hints': [
                'Try to isolate the variable on one side of the equation.',
                'Look for terms that need to be distributed.',
                'Remember to apply the same operation to both sides of the equation.'
            ]
        }
    
    def generate_expression_simplification(self, difficulty: int = 2) -> Dict[str, Any]:
        """Generate a problem simplifying algebraic expressions (TEKS A.3B)"""
        x = sp.Symbol('x')
        
        if difficulty == 1:
            # Simple expression like 3x + 2x + 5
            a = random.randint(2, 5)
            b = random.randint(1, 5)
            c = random.randint(1, 10)
            
            expression = a*x + b*x + c
            simplified = expression.expand()
            
            problem_text = f"Simplify the expression: {sp.latex(a*x)} + {sp.latex(b*x)} + {c}"
            solution_steps = f"Combine like terms: {sp.latex(a)}x + {sp.latex(b)}x + {c} = {sp.latex((a+b))}x + {c}" 
            correct_answer = f"{a+b}x + {c}"
            
        elif difficulty == 2:
            # Moderate expression like 2(x + 3) + 4x
            a = random.randint(2, 5)
            b = random.randint(1, 5)
            c = random.randint(1, 5)
            
            expression = a*(x + b) + c*x
            simplified = expression.expand()
            
            problem_text = f"Simplify the expression: {sp.latex(a)}({sp.latex(x + b)}) + {sp.latex(c*x)}"
            solution_steps = f"Distribute {a}: {sp.latex(a*x + a*b)} + {sp.latex(c*x)}\n"
            solution_steps += f"Combine like terms: {sp.latex(a*x)} + {sp.latex(a*b)} + {sp.latex(c*x)} = {sp.latex((a+c)*x + a*b)}"
            correct_answer = f"{a+c}x + {a*b}"
            
        else:  # difficulty >= 3
            # Complex expression like 3(2x - 1) - 2(x - 3)
            a = random.randint(2, 5)
            b = random.randint(1, 4)
            c = random.randint(1, 5)
            d = random.randint(1, 5)
            e = random.randint(1, 5)
            
            expression = a*(b*x - c) - d*(x - e)
            simplified = expression.expand()
            
            problem_text = f"Simplify the expression: {sp.latex(a)}({sp.latex(b*x - c)}) - {sp.latex(d)}({sp.latex(x - e)})"
            solution_steps = f"Distribute {a} on the first term: {sp.latex(a*b*x - a*c)}\n"
            solution_steps += f"Distribute {d} on the second term: {sp.latex(d*x - d*e)}\n" 
            solution_steps += f"Rewrite as: {sp.latex(a*b*x - a*c)} - ({sp.latex(d*x - d*e)})\n"
            solution_steps += f"Apply negative distribution: {sp.latex(a*b*x - a*c)} - {sp.latex(d*x)} + {sp.latex(d*e)}\n"
            solution_steps += f"Combine like terms: {sp.latex(a*b*x - d*x - a*c + d*e)}\n"
            solution_steps += f"Factor out x: {sp.latex((a*b - d)*x + (-a*c + d*e))}\n"
            solution_steps += f"Simplify: {sp.latex(simplified)}"
            correct_answer = sp.latex(simplified)
        
        # Generate answer choices
        distractors = []
        
        # Common error: incorrect combination of like terms
        if difficulty <= 2:
            distractors.append(f"{a+c+1}x + {a*b}")  # Adding incorrectly
            distractors.append(f"{a}x + {c}x + {a*b}")  # Not combining like terms
        else:
            # More complex distractors for higher difficulty
            distractors.append(sp.latex(expression.expand() + random.randint(1, 3)*x))  # Off by a few x terms
            distractors.append(sp.latex(expression.expand() + random.randint(1, 5)))  # Off by a constant
        
        # Add a completely different expression as a distractor
        different_expr = (a+1)*(x + b-1) - (c-1)*x
        distractors.append(sp.latex(different_expr.expand()))
        
        # Filter and limit distractors
        distractors = [d for d in distractors if d != correct_answer]
        distractors = distractors[:3]
        
        # Combine and shuffle options
        all_options = [correct_answer] + distractors
        random.shuffle(all_options)
        
        return {
            'problem_text': problem_text,
            'difficulty': difficulty,
            'answers': {
                'correct': correct_answer,
                'options': all_options
            },
            'solution': solution_steps,
            'hints': [
                'Start by applying the distributive property to any expressions with parentheses.',
                'Gather like terms (terms with the same variable and power).',
                'Combine constants separately from terms with variables.'
            ]
        }
    
    def generate_linear_function_from_points(self, difficulty: int = 2) -> Dict[str, Any]:
        """Generate a problem writing linear functions from points (TEKS 8.8A)"""
        # Generate two points based on difficulty
        if difficulty == 1:
            # Simple points with integer slope like (0, b) and (1, m+b)
            b = random.randint(-5, 5)
            m = random.randint(1, 5) * random.choice([1, -1])
            x1, y1 = 0, b
            x2, y2 = 1, m + b
            
        elif difficulty == 2:
            # Points with simple fractions or integers
            b = random.randint(-5, 5)
            m = random.randint(1, 5) * random.choice([1, -1])
            x1 = random.randint(-3, 3)
            y1 = m * x1 + b
            x2 = x1 + random.randint(1, 3)
            y2 = m * x2 + b
            
        else:  # difficulty >= 3
            # More complex points potentially resulting in fractional slopes
            x1 = random.randint(-5, 5)
            x2 = random.randint(-5, 5)
            while x1 == x2:
                x2 = random.randint(-5, 5)  # Ensure x1 ≠ x2
                
            # Generate slope and y-intercept
            num = random.randint(1, 5)
            den = random.randint(2, 5)
            m = num / den if random.random() < 0.5 else random.randint(1, 5)
            b = random.randint(-5, 5)
            
            y1 = m * x1 + b
            y2 = m * x2 + b
        
        # Generate problem text
        problem_text = f"Write the equation of a line that passes through the points ({x1}, {y1}) and ({x2}, {y2})."
        
        # Calculate slope
        slope = (y2 - y1) / (x2 - x1)
        
        # Calculate y-intercept
        y_intercept = y1 - slope * x1
        
        # Format correct answer in slope-intercept form
        if y_intercept == 0:
            correct_answer = f"y = {slope}x"
        elif y_intercept > 0:
            correct_answer = f"y = {slope}x + {y_intercept}"
        else:
            correct_answer = f"y = {slope}x - {abs(y_intercept)}"
        
        # Solution steps
        solution_steps = f"Step 1: Find the slope using m = (y₂ - y₁) ÷ (x₂ - x₁)\n"
        solution_steps += f"m = ({y2} - {y1}) ÷ ({x2} - {x1})\n"
        solution_steps += f"m = {y2 - y1} ÷ {x2 - x1}\n"
        solution_steps += f"m = {slope}\n\n"
        solution_steps += f"Step 2: Use the point-slope form of a line: y - y₁ = m(x - x₁)\n"
        solution_steps += f"y - {y1} = {slope}(x - {x1})\n\n"
        solution_steps += f"Step 3: Expand and solve for y\n"
        solution_steps += f"y - {y1} = {slope}x - {slope * x1}\n"
        solution_steps += f"y = {slope}x - {slope * x1} + {y1}\n"
        solution_steps += f"y = {slope}x + {y_intercept}"
        
        # Generate distractors (incorrect answers)
        distractors = []
        
        # Common error: flipping the slope
        if x2 - x1 != 0 and y2 - y1 != 0:
            wrong_slope = (x2 - x1) / (y2 - y1)
            wrong_intercept = y1 - wrong_slope * x1
            if wrong_intercept > 0:
                distractors.append(f"y = {wrong_slope}x + {wrong_intercept}")
            else:
                distractors.append(f"y = {wrong_slope}x - {abs(wrong_intercept)}")
        
        # Common error: using just the points as the slope
        wrong_slope_2 = y2 / x2 if x2 != 0 else 1
        distractors.append(f"y = {wrong_slope_2}x")
        
        # Common error: calculating y-intercept incorrectly
        wrong_intercept_2 = y2 - slope * x1
        if wrong_intercept_2 > 0:
            distractors.append(f"y = {slope}x + {wrong_intercept_2}")
        else:
            distractors.append(f"y = {slope}x - {abs(wrong_intercept_2)}")
        
        # Filter and limit distractors
        distractors = [d for d in distractors if d != correct_answer]
        distractors = distractors[:3]
        
        # Combine and shuffle options
        all_options = [correct_answer] + distractors
        random.shuffle(all_options)
        
        return {
            'problem_text': problem_text,
            'difficulty': difficulty,
            'answers': {
                'correct': correct_answer,
                'options': all_options
            },
            'solution': solution_steps,
            'hints': [
                'Calculate the slope using the formula: m = (y₂ - y₁) ÷ (x₂ - x₁)',
                'Use the point-slope form of a line: y - y₁ = m(x - x₁)',
                'Simplify to slope-intercept form: y = mx + b'
            ]
        }

# Example usage
if __name__ == "__main__":
    generator = ProblemGenerator()
    
    # Generate problems for each supported standard
    standards = ['A.2A', 'A.3B', '8.8A']
    all_problems = {}
    
    for standard in standards:
        for difficulty in [1, 2, 3]:
            problems = generator.generate_for_standard(standard, count=2, difficulty=difficulty)
            if standard not in all_problems:
                all_problems[standard] = []
            all_problems[standard].extend(problems)
    
    # Save to JSON file
    with open('generated_problems.json', 'w') as f:
        json.dump(all_problems, f, indent=2)
    
    print(f"Generated {sum(len(probs) for probs in all_problems.values())} problems across {len(standards)} standards.")