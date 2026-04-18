// DIFFICULTY: MEDIUM
 
#include <iostream>
#include <stdexcept>
 
class DataProcessor {
public:
    int*    primary;
    double* secondary;
 
    DataProcessor(int size, bool simulateFail) {
        primary = new int[size];          
        std::cout << "Primary allocated\n";
 
        if (simulateFail) {
            throw std::runtime_error("Hardware fault during init");
            
        }
 
        secondary = new double[size];        
        std::cout << "Secondary allocated\n";
    }
 
    ~DataProcessor() {
        delete[] primary;
        delete[] secondary;
        std::cout << "Cleaned up\n";
    }
 
    void process() {
        primary[0]   = 42;
        secondary[0] = 3.14;
        std::cout << "Processed: " << primary[0] << ", " << secondary[0] << "\n";
    }
};
 
int main() {
    try {
        DataProcessor dp(10, false);
        dp.process();
    } catch (...) {}
 
    try {
        DataProcessor dp(10, true);
    } catch (const std::exception& e) {
        std::cerr << "Caught: " << e.what() << "\n";
    }
 
    return 0;
}
 