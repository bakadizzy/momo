// DIFFICULTY: HARD
#include <iostream>
#include <memory>
#include <string>
 
struct Node {
    std::string name;
    std::shared_ptr<Node> next;  
 
    Node(const std::string& n) : name(n) {
        std::cout << "  [+] Node '" << name << "' constructed\n";
    }
    ~Node() {
        std::cout << "  [-] Node '" << name << "' destroyed\n";
    }
};
 
void safeExample() {
    std::cout << "\n-- Safe (linear chain, no cycle) --\n";
    auto a = std::make_shared<Node>("A");
    auto b = std::make_shared<Node>("B");
    a->next = b;       
    b->next = nullptr; 
}
 
void leakyExample() {
    std::cout << "\n-- Leaky (cycle: A -> B -> A) --\n";
    auto a = std::make_shared<Node>("A");  
    auto b = std::make_shared<Node>("B");  
 
    a->next = b;   
    b->next = a;   
 
    std::cout << "  A use_count = " << a.use_count() << " (expected 2)\n";
    std::cout << "  B use_count = " << b.use_count() << " (expected 2)\n";
 
   
}
 
void fixedExample() {
    std::cout << "\n-- Fixed (weak_ptr breaks the cycle) --\n";
 
    struct SafeNode {
        std::string name;
        std::shared_ptr<SafeNode> next;  
        std::weak_ptr<SafeNode>   prev;  
        SafeNode(const std::string& n) : name(n) {
            std::cout << "  [+] SafeNode '" << name << "' constructed\n";
        }
        ~SafeNode() {
            std::cout << "  [-] SafeNode '" << name << "' destroyed\n";
        }
    };
 
    auto x = std::make_shared<SafeNode>("X");
    auto y = std::make_shared<SafeNode>("Y");
    x->next = y;    
    y->prev = x;    
 
    
}
 
int main() {
    safeExample();
    leakyExample();
    fixedExample();
 
    std::cout << "\nDone. Leaked nodes from leakyExample() are never freed.\n";
    return 0;
}
 