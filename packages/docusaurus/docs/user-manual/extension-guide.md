---
sidebar_position: 4
---

import BrowserWindow from '@site/src/components/BrowserWindow';

# Browser Extension/User Script Guide

This section will provide detailed instructions on how to use UTags browser extensions and user scripts, helping you fully utilize web page tagging features to enhance your browsing experience.

## Interface Introduction

### Main Interface Elements

After installing and enabling the UTags browser extension or user script, you will see the following interface elements on web pages:

1. **Tag Icon (🏷️)**: When you hover your mouse over supported elements (such as usernames, posts, links, etc.), a tag icon will appear for adding or editing tags

<BrowserWindow url="https://www.reddit.com/">
  ![添加标签截图](../assets/extension-usage-4.png)
</BrowserWindow>

2. **Tag Input Box**: Appears after clicking the tag icon, used for entering and editing tags

<BrowserWindow url="https://www.reddit.com/">
![添加标签截图](../assets/extension-usage-5.png)
</BrowserWindow>

3. **Tag Display**: Added tags will be displayed next to or below the element

<BrowserWindow url="https://www.reddit.com/">
![添加标签截图](../assets/extension-usage-6.png)
</BrowserWindow>

4. **Extension Icon**: The UTags icon in the browser toolbar; click to access settings and other functions

   ![Extension Icon Screenshot](../assets/extension-usage-7.png)

:::info
The browser extension version does not currently support popup menus. This feature is coming soon.
:::

### Settings Panel

Click the UTags icon in the browser toolbar, then select "Settings" to access the settings panel. The settings panel contains the following main options:

1. **General Settings**: Basic settings such as language, interface style, etc.
2. **Tag Settings**: Tag display method, color, size, etc.
3. **Special Tags**: Behavior settings for special tags
4. **Browsing History**: Whether to enable browsing history function and how to display viewed content
5. **Quick Star**: Whether to enable quick star marking
   <!-- 5. **Shortcuts**: Keyboard shortcut settings -->
   <!-- 6. **About**: Version information and help links -->
   <BrowserWindow url="https://www.youtube.com/">
   ![设置面板截图](../assets/extension-settings-1.png)
   </BrowserWindow>

## Tag Operations

### Adding Tags to Web Elements

1. Hover your mouse over a supported element (such as username, post title, link, etc.)
2. Click the tag icon (🏷️) that appears
3. Enter tags in the popup input box
   - Separate multiple tags with commas, such as `important,work,to-read`
   - Tags support spaces and special characters
   - You can use hierarchical structures, such as `tech/programming/JavaScript`
4. Press Enter or click the confirm button to save the tags

<BrowserWindow url="https://www.reddit.com/">
  ![添加标签截图](../assets/extension-usage-6.png)
</BrowserWindow>

### Editing Existing Tags

1. Hover your mouse over existing tags
2. Click the tag icon
3. Click the "Copy" button to copy the tags to the input box for editing
4. Press Enter or click the confirm button to save changes
<!-- 3. Edit tags in the popup input box -->

  <BrowserWindow url="https://www.tiktok.com/">
   ![编辑标签截图1](../assets/extension-edit-1.png)
  </BrowserWindow>
  <BrowserWindow url="https://www.tiktok.com/">
   ![编辑标签截图2](../assets/extension-edit-2.png)
  </BrowserWindow>

### Deleting Tags

1. Hover your mouse over existing tags
2. Click the tag icon
3. Delete unwanted tags in the popup input box
4. Press Enter or click the confirm button to save changes
<!-- 4. To delete all tags, clear the input box -->

  <BrowserWindow url="https://www.tiktok.com/">
   ![删除标签截图](../assets/extension-delete-1.png)
  </BrowserWindow>

<!-- ### Batch Operations

On some supported websites, UTags provides batch operation functionality:

1. Select multiple elements on the page (such as multiple posts or links)
2. Use the shortcut key (default is `Alt+T`) or "Batch Add Tags" in the right-click menu
3. Enter the tags you want to add in the popup dialog
4. Click the confirm button to apply to all selected elements -->

## Special Tag Features

Special tags are tags with specific functions that can implement content filtering, highlighting, and other effects to enhance the browsing experience.

:::info
Currently, only some websites have adapted this feature. If other websites need this feature, please [contact the developer](/contact).
:::

### Common Special Tags

- **`block`** or **`hide`**: Block content with this tag, making it no longer displayed
- **`favorite`** or **`★`**: Mark content as a favorite, usually highlighted
- **`important`**: Mark important content, usually highlighted
- **`read-later`**: Mark content to view later
  <!-- - **`read`**: Mark content as read, usually changes the display style -->
  <!-- - **`nsfw`**: Mark content not suitable for workplace viewing, blurred by default -->

### How to Use Special Tags

1. Add special tags just like adding regular tags
2. Special tags take effect immediately, changing how content is displayed
3. You can customize the behavior of special tags in settings

<BrowserWindow url="https://meta.discourse.org/">
![特殊标签的使用方法](../assets/extension-demo-1.gif)
</BrowserWindow>

<!--
### Customizing Special Tags

You can customize the behavior of special tags in settings:

1. Open UTags settings
2. Select the "Special Tags" tab
3. Add new special tags or modify the behavior of existing special tags
4. Set the effect of tags (such as hiding, highlighting, blurring, etc.)
5. Save settings
-->

For more special tags, see [Special Tags Usage](./special-tags.md).

## Tag Management

> ⚠️ **Note**: Tag management features are only available in the UTags web application (bookmark manager); the browser extension does not directly support these advanced tag management features.

To manage your tags (view, rename, merge, or delete), please visit the UTags web application:

1. Open the [UTags web application](https://utags.link)
2. Set up the sync function to ensure the browser extension stays in sync with the web application (added automatically by default; if there is no sync configuration, please refer to the manual configuration method)
3. Click the "Tags" option in the left sidebar

In the web application, you can perform the following tag management operations:

- **View all tags**: The "Tags" section in the left sidebar displays all tags and their usage count
- **Rename tags**: Click the edit icon next to a tag, enter a new name, and save
- **Merge tags**: Select the tags you want to merge and use the merge function to combine them
- **Delete tags**: Click the delete icon next to a tag and confirm the deletion operation

![UTags Web Application Tag Management Interface](../assets/webapp-1.png)

> 💡 **Tip**: Using the web application for tag management provides more powerful features and a better user experience. Tag changes you make in the web application will automatically apply to the browser extension through the sync function.

## Custom Styles

<!--
### Tag Display Style

1. Open UTags settings
2. Enable custom styles for global or current website
3. Add custom styles, you can set the size, color, background, border, etc. of tags
-->

<!--
2. Select the "Tag Settings" tab
3. Customize the following options:
   - Tag size
   - Tag color
   - Tag background
   - Tag border
-->

   <!-- - Tag border radius -->
   <!-- - Tag spacing -->
   <!-- - Tag position (next to or below the element) -->

### Using Custom CSS

For advanced users, UTags supports using custom CSS styles to personalize tag display:

1. Open UTags settings
2. Enable custom styles for global or current website
3. Enter CSS code in the "Custom CSS" text box
4. Save settings

Example custom CSS:

<BrowserWindow url="https://utags.link/">

```css
/* 全局标签样式 */
body {
  /* 标签文字颜色 */
  --utags-text-tag-color: white;
  /* 标签边框颜色 */
  --utags-text-tag-border-color: red;
  /* 标签背景颜色 */
  --utags-text-tag-background-color: red;
}

/* 特定标签样式：标签为 'TEST' 的样式 */
[data-utags_tag='TEST'] {
  /* 标签文字颜色 */
  --utags-text-tag-color: white;
  /* 标签边框颜色 */
  --utags-text-tag-border-color: orange;
  /* 标签背景颜色 */
  --utags-text-tag-background-color: orange;
}

/* 列表项样式：含有 'bar' 标签的条目 */
[data-utags_list_node*=',bar,'] {
  /* 列表中含有 'bar' 标签的条目的背景色 */
  background-color: aqua;
}

/* 浏览历史样式 */
body {
  /* 浏览过的帖子的标题颜色 */
  --utags-visited-title-color: red;
}

/* 深色模式下的样式 */
[data-utags_darkmode='1'] body {
  /* 浏览过的帖子的标题颜色 */
  --utags-visited-title-color: yellow;
}
```

</BrowserWindow>

## List of Supported Websites

UTags currently supports more than 50 mainstream websites, including but not limited to the following categories:

### Social Media

- Twitter/X
- Facebook
- Instagram
- Threads
  <!-- - LinkedIn -->
  <!-- - Mastodon -->

### Video Platforms

- YouTube
- Bilibili
- TikTok
- Twitch
<!-- - Vimeo -->

### Development Platforms

- GitHub
  <!-- - GitLab -->
  <!-- - Stack Overflow -->
  <!-- - CodePen -->

### Forums and Communities

- Reddit
- Hacker News
- Discourse forums
- Flickr
  <!-- - Discord -->
  <!-- - Telegram Web -->

### News and Reading

- Inoreader
  <!-- - Medium -->
  <!-- - Substack -->
  <!-- - RSS readers -->
  <!-- - Mainstream news websites -->

<!--
### E-commerce Platforms

- Amazon
- eBay
- AliExpress

### Others

- Wikipedia
- Google search results
- Bing search results
-->

The complete list of supported websites can be viewed in the [GitHub repository](https://github.com/utags/utags). If you would like UTags to support other websites, feel free to submit a request on GitHub or [contact the developer](/contact).

<!--
## Keyboard Shortcuts

UTags provides the following default keyboard shortcuts:

- **Alt+T**: Add tags to the current element
- **Alt+Shift+T**: Batch add tags
- **Alt+B**: Toggle display/hide of blocked tags
- **Alt+H**: Toggle display/hide of hidden tags
- **Alt+F**: Mark the current element as a favorite

You can customize these shortcuts in settings.
-->

## Troubleshooting

### Tags Not Displaying

If tags are not displaying, please follow these steps to troubleshoot:

1. Make sure the website you are visiting is in the supported list
2. Refresh the page (press F5 or Ctrl+R)
3. Check if the browser extension or user script is enabled (in the browser's extension management page or user script management page)
4. Check if there are other extensions conflicting with UTags (try temporarily disabling other extensions or user scripts)
5. Check if the tag display options are correctly configured in UTags settings

### Sync Issues

If you encounter data synchronization issues, please follow these steps to troubleshoot:

1. Check if the sync settings are correctly configured
2. Check if you have configured synchronization between the browser extension or user script and the web application, and enabled automatic synchronization
3. Ensure the network connection is normal and stable
4. For GitHub sync, check if the personal access token is valid and has the correct permissions
5. For WebDAV sync, check if the server address, username, and password are correct
6. Try manually triggering synchronization and check for error messages

### Performance Issues

If you encounter performance issues (such as slow page loading or response delays), try the following solutions:

1. Update your browser and UTags extension to the latest version
2. [Report the issue](https://github.com/utags/utags/issues) to the developer, providing a detailed description of the problem and steps to reproduce it

<!-- 1. Reduce the number of tags used -->
<!-- 2. Disable unnecessary features in settings -->
<!-- 3. Clear browser cache -->

## Getting Help

If you encounter any issues while using the UTags browser extension or user script, or have any suggestions and feedback, you can get help through the following channels:

1. Check the [Frequently Asked Questions](./faq.md) (FAQ)
2. Submit an issue report on [GitHub Issues](https://github.com/utags/utags/issues)
3. Visit the [Contact page](/contact) for more support channels

```

```
