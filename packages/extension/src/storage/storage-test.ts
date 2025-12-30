import {
  addValueChangeListener,
  deleteValue,
  getValue,
  removeValueChangeListener,
  runStorageTests,
  setValue,
} from 'browser-extension-storage'

export function storageTest() {
  // 运行测试
  void runStorageTests(
    {
      getValue,
      setValue,
      deleteValue,
      addValueChangeListener,
      removeValueChangeListener,
    },
    console.log
  ).then((passed) => {
    if (passed) {
      console.log('所有存储测试通过！')
    } else {
      console.error('存储测试失败，请检查日志。')
    }
  })
}
