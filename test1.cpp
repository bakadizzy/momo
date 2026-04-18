#include <iostream>
 
void allocateData() {
    int* data = new int[100]; 
    for (int i = 0; i < 100; i++) {
        data[i] = i;
    }
    std::cout << "First element: " << data[0] << std::endl;
}
 
int main() {
    for (int i = 0; i < 10; i++) {
        allocateData(); 
    }
    return 0;
}
